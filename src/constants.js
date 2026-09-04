// src/constants.js
// Single source of truth for enum-like values used across the application.

export const ROLES = Object.freeze({
  STUDENT: 'student',
  NURSE: 'nurse',
  ADMIN: 'admin'
});

export const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
});

export const APPOINTMENT_TYPE = Object.freeze({
  PHYSICAL: 'Physical',
  ONLINE: 'Online'
});

// Daily.co room lifecycle timing (minutes relative to appointment Time)
export const DAILY = Object.freeze({
  JOIN_WINDOW_BEFORE_MIN: 15,   // earliest a user can join before the slot
  ROOM_BUFFER_AFTER_MIN: 60,    // room/token stays valid this long past the slot
  API_BASE: 'https://api.daily.co/v1'
});

export const SEVERITY = Object.freeze({
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High'
});

// Tier-2 escalation rules engine tuning (Phase 29B).
export const ESCALATION = Object.freeze({
  RECURRENCE_WINDOW_DAYS: 7,   // "recent" check/booking window
  RECURRENCE_OVERLAP: 0.5,     // >= half of the PREVIOUS check's symptoms reappear
  DURATION_ESCALATE: ['1-2 weeks', '>2 weeks'] // symptom durations that warrant a nurse
});

// NMU campuses (Gqeberha) — nurses are assigned to a campus rather than a street address.
// Source: mandela.ac.za campus maps (six Gqeberha campuses + George in the Southern Cape).
export const CAMPUSES = Object.freeze([
  'South Campus',
  'North Campus',
  '2nd Avenue Campus',
  'Missionvale Campus',
  'Bird Street Campus',
  'Ocean Sciences Campus',
  'George Campus'
]);

// ============================================================================
// HEALTH-TREND MAP TUNING (Phase 30G)
// ============================================================================
// The heat map is a true density surface built from per-report coordinate
// snapshots (see SymptomLog.Latitude/Longitude/ZoneID). These thresholds drive
// the outbreak classification of a zone and the map legend — promoted out of
// the old inline view JS so backend + frontend agree on one source of truth.
export const TREND = Object.freeze({
  // Activity levels are defined as a REPORTS-PER-DAY RATE for a single zone, not a
  // flat count — otherwise a 1-year window trivially goes red. A meaningful local
  // cluster for NMU students in one Gqeberha suburb is on the order of a couple of
  // reports per day sustained. The absolute threshold for a period is derived from
  // this rate but scaled SUB-LINEARLY (see outbreakThresholdFor) so longer windows
  // need more reports without demanding an impossible number.
  //   Quiet     ~0        — background / nothing
  //   Low       up to ~0.35/day
  //   Moderate  ~0.35–0.9/day  — worth watching
  //   High      ~0.9–1.6/day   — elevated local cluster
  //   Outbreak  >~1.6/day      — clear concentrated spike
  BUCKETS: [
    { key: 'quiet',    label: 'Quiet',    rate: 0,     color: '#12b9b9' },
    { key: 'low',      label: 'Low',      rate: 0.05,  color: '#3fb950' },
    { key: 'moderate', label: 'Moderate', rate: 0.35,  color: '#ffcc00' },
    { key: 'high',     label: 'High',     rate: 0.9,   color: '#f5a623' },
    { key: 'outbreak', label: 'Outbreak', rate: 1.6,   color: '#e5484d' }
  ],
  // Outbreak rate (reports/day) a single zone must sustain to be flagged.
  OUTBREAK_RATE: 1.6,
  // How the per-day rate converts to an absolute count over `days`. Sub-linear
  // (sqrt-weighted) so a week needs ~a handful, a year needs many more but not 365×.
  // effectiveWindow = 7 + (days - 7) ^ SCALE_EXP, capped so very long spans plateau.
  SCALE_EXP: 0.6,
  SCALE_CAP_DAYS: 120, // effective window never exceeds this many "rate-days"
  // Coordinate jitter (degrees, ~30–60m) applied when snapshotting a report so
  // individual students are never pinpointed — density is preserved, privacy is not lost.
  PRIVACY_JITTER_DEG: 0.0006,
  // Map default view (Gqeberha).
  MAP_CENTER: [25.60, -33.95],
  MAP_ZOOM: 11.4,
  // Query period presets shared by the API + dashboard selectors.
  PERIODS: Object.freeze({ '7d': 7, '1m': 30, '2m': 60, '6m': 180, '1y': 365 })
});

/**
 * Effective "rate window" in days for threshold scaling. Grows sub-linearly with
 * the real window so long spans don't inflate outbreak counts to unrealistic levels.
 */
export function effectiveWindow(days) {
  const base = 7;
  if (days <= base) return days;
  const grown = base + Math.pow(days - base, TREND.SCALE_EXP);
  return Math.min(grown, TREND.SCALE_CAP_DAYS);
}

/** Absolute report count at/above which a zone is an outbreak, for a given window. */
export function outbreakThresholdFor(days) {
  return Math.max(6, Math.round(TREND.OUTBREAK_RATE * effectiveWindow(days)));
}

/** Classify a zone's report total into a bucket key, scaled to the window. */
export function bucketForCount(count, days) {
  const win = effectiveWindow(days);
  let key = 'quiet';
  for (const b of TREND.BUCKETS) {
    if (count >= Math.round(b.rate * win)) key = b.key;
  }
  return key;
}
