// src/modules/symptoms/symptoms.controller.js
// Handles Tier 1 symptom checking, OTC recommendations, and symptom history.

import crypto from 'crypto';
import * as SymptomsModel from './symptoms.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { SEVERITY } from '../../constants.js';

// ============================================================================
// SYMPTOM FORM
// ============================================================================

export const renderSymptomForm = catchAsync(async (req, res) => {
  const symptoms = await SymptomsModel.getAllSymptoms();
  res.render('student/symptom-form', { user: req.session.user, symptoms, error: null });
});

// ============================================================================
// EVALUATE SYMPTOMS
// ============================================================================

export const processSymptomCheck = catchAsync(async (req, res) => {
  const { symptomName, severity } = req.body;

  if (!symptomName) {
    const symptoms = await SymptomsModel.getAllSymptoms();
    return res.status(400).render('student/symptom-form', {
      user: req.session.user, symptoms, error: 'Please select a symptom to evaluate.'
    });
  }

  const symptom = await SymptomsModel.getSymptomByName(symptomName);
  const medications = await SymptomsModel.getMedicationsForSymptom(symptomName);

  if (!symptom) {
    const symptoms = await SymptomsModel.getAllSymptoms();
    return res.status(404).render('student/symptom-form', {
      user: req.session.user, symptoms, error: 'Selected symptom not found in the system.'
    });
  }

  // Determine escalation: Tier >= 2 OR severity reported as High
  const escalation = (symptom.Tier >= 2) || (severity === SEVERITY.HIGH);

  // Log this check (non-blocking — don't fail the whole request on log error)
  try {
    const logId = 'LOG-' + crypto.randomBytes(6).toString('hex');
    await SymptomsModel.createSymptomLog(logId, req.session.user.id, symptomName, severity);
  } catch (logErr) {
    console.error('Symptom log write failed (non-blocking):', logErr.message);
  }

  res.render('student/recommendations', {
    user: req.session.user, symptom, severity, medications, escalation, error: null
  });
});

// ============================================================================
// SYMPTOM HISTORY
// ============================================================================

export const showSymptomHistory = catchAsync(async (req, res) => {
  const logs = await SymptomsModel.getSymptomHistory(req.session.user.id);
  res.render('student/symptom-history', { user: req.session.user, logs, error: null });
});
