// src/modules/symptoms/symptoms.controller.js
// Handles the tag-based symptom checker: multi-select evaluation + relevance-scored recommendations.

import crypto from 'crypto';
import * as SymptomsModel from './symptoms.model.js';
import { catchAsync } from '../../utils/catchAsync.js';

// ============================================================================
// SYMPTOM FORM (Tag Picker)
// ============================================================================

export const renderSymptomForm = catchAsync(async (req, res) => {
  const symptomsByCategory = await SymptomsModel.getAllSymptomsByCategory();
  res.render('student/symptom-form', { user: req.session.user, symptomsByCategory, error: null });
});

// ============================================================================
// EVALUATE (Multi-Select)
// ============================================================================

export const processSymptomCheck = catchAsync(async (req, res) => {
  let { symptoms, severity } = req.body;

  // symptoms comes as array (multiple checkboxes) or string (single)
  if (!symptoms) {
    const symptomsByCategory = await SymptomsModel.getAllSymptomsByCategory();
    return res.status(400).render('student/symptom-form', {
      user: req.session.user, symptomsByCategory, error: 'Please select at least one symptom.'
    });
  }

  // Normalise to array
  if (!Array.isArray(symptoms)) symptoms = [symptoms];

  // Fetch selected symptom details
  const selectedSymptoms = await SymptomsModel.getSymptomsByIds(symptoms);
  if (selectedSymptoms.length === 0) {
    const symptomsByCategory = await SymptomsModel.getAllSymptomsByCategory();
    return res.status(400).render('student/symptom-form', {
      user: req.session.user, symptomsByCategory, error: 'Invalid symptom selection.'
    });
  }

  // Determine max tier (drives escalation)
  const maxTier = Math.max(...selectedSymptoms.map(s => s.Tier));

  // Get medications ranked by relevance
  const medications = await SymptomsModel.getMedicationsForSymptoms(symptoms);

  // For each med, get which of the student's symptoms it covers
  for (const med of medications) {
    const coverage = await SymptomsModel.getMedicationSymptomCoverage(med.MedicationCode, symptoms);
    med.covers = coverage.map(c => c.Name);
  }

  // Log this check
  try {
    const logId = 'LOG-' + crypto.randomBytes(6).toString('hex');
    await SymptomsModel.createSymptomLog(logId, req.session.user.id, severity || 'Moderate', symptoms);
  } catch (logErr) {
    console.error('Symptom log write failed (non-blocking):', logErr.message);
  }

  res.render('student/recommendations', {
    user: req.session.user,
    selectedSymptoms,
    severity: severity || 'Moderate',
    medications,
    maxTier,
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
