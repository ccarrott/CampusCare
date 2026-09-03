// src/modules/symptoms/symptoms.controller.js
// Handles the tag-based symptom checker: multi-select evaluation + relevance-scored recommendations.

import crypto from 'crypto';
import * as SymptomsModel from './symptoms.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sanitize } from '../../utils/sanitize.js';
import { evaluateEscalation } from './escalation.js';
import { ESCALATION } from '../../constants.js';

// ============================================================================
// SYMPTOM FORM (Tag Picker)
// ============================================================================

export const renderSymptomForm = catchAsync(async (req, res) => {
  const symptomsByCategory = await SymptomsModel.getAllSymptomsByCategory();

  // "Same as last time?" prefill: offer the student's most recent recent check.
  let lastCheck = null;
  try {
    const lc = await SymptomsModel.getLastSymptomCheck(req.session.user.id, ESCALATION.RECURRENCE_WINDOW_DAYS);
    if (lc && lc.symptomIds.length > 0) {
      lastCheck = { ids: lc.symptomIds, date: lc.logDate };
    }
  } catch (e) { /* non-blocking */ }

  res.render('student/symptom-form', { user: req.session.user, symptomsByCategory, lastCheck, error: null });
});

// ============================================================================
// EVALUATE (Multi-Select)
// ============================================================================

export const processSymptomCheck = catchAsync(async (req, res) => {
  let { symptoms, severity, duration, trajectory } = req.body;
  const otherText = sanitize(req.body.otherText || '').slice(0, 255);

  // Normalise symptoms to an array (may be empty if only free-text was given).
  if (!symptoms) symptoms = [];
  if (!Array.isArray(symptoms)) symptoms = [symptoms];

  // Must have EITHER at least one symptom OR a free-text description.
  if (symptoms.length === 0 && !otherText) {
    const symptomsByCategory = await SymptomsModel.getAllSymptomsByCategory();
    return res.status(400).render('student/symptom-form', {
      user: req.session.user, symptomsByCategory, lastCheck: null,
      error: 'Please select at least one symptom, or describe one that isn\'t listed.'
    });
  }

  const selectedSymptoms = symptoms.length > 0 ? await SymptomsModel.getSymptomsByIds(symptoms) : [];
  const baseTier = selectedSymptoms.length > 0 ? Math.max(...selectedSymptoms.map(s => s.Tier)) : 1;

  // Recurrence context (non-blocking).
  let lastCheck = null, recentBooking = false;
  try { lastCheck = await SymptomsModel.getLastSymptomCheck(req.session.user.id, ESCALATION.RECURRENCE_WINDOW_DAYS); }
  catch (e) { /* ignore */ }

  // Run the escalation engine.
  const { tier: maxTier, reasons: escalationReasons } = evaluateEscalation({
    baseTier,
    severity: severity || 'Moderate',
    duration,
    trajectory,
    otherText,
    currentIds: symptoms,
    lastCheck,
    recentBooking
  });

  // Medications only when NOT escalated past Tier 1 and there are Tier-1 symptoms.
  let medications = [];
  if (symptoms.length > 0) {
    medications = await SymptomsModel.getMedicationsForSymptoms(symptoms);
    for (const med of medications) {
      const coverage = await SymptomsModel.getMedicationSymptomCoverage(med.MedicationCode, symptoms);
      med.covers = coverage.map(c => c.Name);
    }
  }

  // Log this check (non-blocking).
  try {
    const logId = 'LOG-' + crypto.randomBytes(6).toString('hex');
    await SymptomsModel.createSymptomLog(logId, req.session.user.id, severity || 'Moderate', symptoms, {
      duration: duration || null,
      trajectory: trajectory || null,
      otherText: otherText || null
    });
  } catch (logErr) {
    console.error('Symptom log write failed (non-blocking):', logErr.message);
  }

  res.render('student/recommendations', {
    user: req.session.user,
    selectedSymptoms,
    severity: severity || 'Moderate',
    medications,
    maxTier,
    escalationReasons,
    otherText,
    error: null
  });
});

// ============================================================================
// SYMPTOM HISTORY
// ============================================================================

export const showSymptomHistory = catchAsync(async (req, res) => {
  const logs = await SymptomsModel.getSymptomHistory(req.session.user.id);
  res.render('student/symptom-history', { user: req.session.user, logs, error: null });
});
