/**
 * CampusCare — Permission helper (Phase 29C)
 *
 * Minimal, professional permission prompting:
 *  - Location: asked once per login session on first load. Uses the Permissions API
 *    to avoid re-prompting when already granted, and to skip pointless prompts when
 *    the user has hard-denied (the browser blocks those anyway).
 *  - Camera/mic: handled by the Daily.co call on first join (see call.ejs readiness note).
 *
 * Requires a secure context (HTTPS) in production; localhost is exempt.
 */
(function () {
  window.CampusCarePermissions = window.CampusCarePermissions || {};

  /**
   * Ensure we have (or have asked for) geolocation. Resolves regardless of outcome.
   * If state is 'prompt' we trigger getCurrentPosition so the browser shows its native ask.
   * If 'granted' or 'denied', we do nothing (no nagging).
   */
  window.CampusCarePermissions.ensureLocation = function () {
    if (!('geolocation' in navigator)) return;

    function ask() {
      try {
        navigator.geolocation.getCurrentPosition(function () {}, function () {}, { maximumAge: 300000, timeout: 10000 });
      } catch (e) { /* ignore */ }
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(function (status) {
        if (status.state === 'prompt') ask();
        // 'granted' → nothing to do; 'denied' → respect it, don't loop prompts.
      }).catch(function () {
        // Permissions API unsupported for this name — just attempt once.
        ask();
      });
    } else {
      ask();
    }
  };

  // Ask for location once per login session (re-asks on next login since sessionStorage clears).
  // Only fires on pages that opt in via a #requestLocationFlag element (the dashboard).
  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('requestLocationFlag')) return;
    try {
      if (sessionStorage.getItem('cc_loc_asked')) return;
      sessionStorage.setItem('cc_loc_asked', '1');
    } catch (e) { /* sessionStorage blocked — still ask once */ }
    window.CampusCarePermissions.ensureLocation();
  });
})();
