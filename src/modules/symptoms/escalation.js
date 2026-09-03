// src/modules/symptoms/escalation.js
// Phase 29B: transparent Tier-2 escalation rules engine.
// Each signal can only RAISE the tier to 2; it never lowers a tier and never
// overrides a Tier-3 result. Returns { tier, reasons: [] } so the view can explain why.

import { ESCALATION, SEVERITY } from '../../constants.js';

const SEVERITY_RANK = { [SEVERITY.LOW]: 1, [SEVERITY.MODERATE]: 2, [SEVERITY.HIGH]: 3 };

/**
 * @param {object} ctx
 *   baseTier      – max tier from the selected symptoms
 *   severity      – current check severity (Low/Moderate/High)
 *   duration      – e.g. '<3 days' | '3-7 days' | '1-2 weeks' | '>2 weeks'
 *   trajectory    – 'worse' | 'same' | 'better'
 *   otherText     – free-text "not listed" description (non-empty => escalate)
 *   currentIds    – array of selected symptom IDs this check
 *   lastCheck     – { severity, symptomIds } from a check within the window, or null
 *   recentBooking – boolean: booked within the window
 */
export function evaluateEscalation(ctx) {
  const {
    baseTier = 1, severity, duration, trajectory, otherText,
    currentIds = [], lastCheck = null, recentBooking = false
  } = ctx;

  let tier = baseTier;
  const reasons = [];
  const escalate = (reason) => { tier = Math.max(tier, 2); reasons.push(reason); };

  // Signal: free-text "my symptom isn't listed" → always warrants assessment.
  if (otherText && otherText.trim()) {
    escalate('You described a symptom that isn\'t in our list, which needs a nurse\'s assessment.');
  }

  // Signal: recurrence — >= half of the PREVIOUS check's symptoms reappear within the window.
  if (lastCheck && lastCheck.symptomIds && lastCheck.symptomIds.length > 0 && currentIds.length > 0) {
    const prev = new Set(lastCheck.symptomIds);
    const sameCount = currentIds.filter(id => prev.has(id)).length;
    if (sameCount / lastCheck.symptomIds.length >= ESCALATION.RECURRENCE_OVERLAP) {
      escalate('You reported similar symptoms recently — recurring symptoms should be seen by a nurse.');
    }
  }

  // Signal: escalating severity vs the last recent check.
  if (lastCheck && lastCheck.severity && severity) {
    const prevRank = SEVERITY_RANK[lastCheck.severity] || 0;
    const nowRank = SEVERITY_RANK[severity] || 0;
    if (nowRank > prevRank) {
      escalate('Your symptoms have worsened in severity since your last check.');
    }
  }

  // Signal: persistent duration.
  if (duration && ESCALATION.DURATION_ESCALATE.includes(duration)) {
    escalate('These symptoms have lasted a while — persistent symptoms should be assessed.');
  }

  // Signal: self-reported "getting worse".
  if (trajectory === 'worse') {
    escalate('You reported your symptoms are getting worse.');
  }

  // Signal: booked again within the window.
  if (recentBooking) {
    escalate('You booked a consultation recently — please continue with professional care.');
  }

  return { tier, reasons };
}
