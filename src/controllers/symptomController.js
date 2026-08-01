import * as SymptomModel from '../models/symptomModel.js';
import { query } from '../config/database.js';
import crypto from 'crypto';

// ============================================================================
// SYMPTOM CONTROLLER - Tier 1 Health Check & OTC Recommendations
// ============================================================================

/**
 * GET /symptoms
 * Fetches all symptoms from the database and renders the symptom selection form.
 */
export async function renderSymptomForm(req, res) {
  try {
    const symptoms = await SymptomModel.getAllSymptoms();

    res.render('student/symptom-form', {
      user: req.session.user,
      symptoms,
      error: null
    });
  } catch (error) {
    console.error('Symptom form error:', error);
    res.status(500).render('student/symptom-form', {
      user: req.session.user,
      symptoms: [],
      error: 'Unable to load symptoms. Please try again later.'
    });
  }
}

/**
 * POST /symptoms/evaluate
 * Processes the selected symptom and severity, fetches recommendations,
 * and evaluates whether clinical escalation is needed.
 */
export async function processSymptomCheck(req, res) {
  try {
    const { symptomName, severity } = req.body;

    if (!symptomName) {
      const symptoms = await SymptomModel.getAllSymptoms();
      return res.status(400).render('student/symptom-form', {
        user: req.session.user,
        symptoms,
        error: 'Please select a symptom to evaluate.'
      });
    }

    // Fetch symptom details and matching medications
    const symptom = await SymptomModel.getSymptomByName(symptomName);
    const medications = await SymptomModel.getMedicationsForSymptom(symptomName);

    if (!symptom) {
      const symptoms = await SymptomModel.getAllSymptoms();
      return res.status(404).render('student/symptom-form', {
        user: req.session.user,
        symptoms,
        error: 'Selected symptom not found in the system.'
      });
    }

    // Determine escalation: Tier >= 2 OR severity reported as High
    const escalation = (symptom.Tier >= 2) || (severity === 'High');

    // Log this symptom check to SymptomLog
    try {
      const logId = 'LOG-' + crypto.randomBytes(6).toString('hex');
      await query(
        'INSERT INTO SymptomLog (LogID, StudentNumber, SymptomName, Severity, LogDate) VALUES (?, ?, ?, ?, NOW())',
        [logId, req.session.user.id, symptomName, severity]
      );
    } catch (logErr) {
      console.error('Symptom log write failed (non-blocking):', logErr.message);
    }

    res.render('student/recommendations', {
      user: req.session.user,
      symptom,
      severity,
      medications,
      escalation,
      error: null
    });
  } catch (error) {
    console.error('Symptom evaluation error:', error);
    res.status(500).render('student/recommendations', {
      user: req.session.user,
      symptom: null,
      severity: null,
      medications: [],
      escalation: false,
      error: 'An error occurred while evaluating your symptoms. Please try again.'
    });
  }
}


/**
 * GET /symptoms/history
 * Displays the student's personal symptom check history from SymptomLog.
 */
export async function showSymptomHistory(req, res) {
  try {
    const studentNumber = req.session.user.id;

    const logs = await query(
      'SELECT LogID, SymptomName, Severity, LogDate, Notes FROM SymptomLog WHERE StudentNumber = ? ORDER BY LogDate DESC LIMIT 50',
      [studentNumber]
    );

    res.render('student/symptom-history', {
      user: req.session.user,
      logs,
      error: null
    });
  } catch (error) {
    console.error('Symptom history error:', error);
    res.status(500).render('student/symptom-history', {
      user: req.session.user,
      logs: [],
      error: 'Unable to load symptom history.'
    });
  }
}
