/**
 * CampusCare Admin Tools — Browser Console Helper
 * Usage (while logged in as admin):
 *   CampusCare.showcase()   — Load full demo data
 *   CampusCare.outbreak()   — Simulate outbreak
 *   CampusCare.clear()      — Remove outbreak data
 *   CampusCare.naked()      — Nuclear reset (fresh deployment)
 */
(function() {
  function getCsrf() {
    // Prefer the page-wide meta tag (present on every logged-in page), then fall back
    // to a form's hidden input for older pages.
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) return meta.content;
    var el = document.querySelector('input[name="_csrf"]');
    return el ? el.value : '';
  }

  async function stateCall(endpoint, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    var token = getCsrf();
    if (!token) {
      console.error('❌ No CSRF token found on this page. Make sure you are logged in as an admin, then try again (any admin page works).');
      return;
    }
    console.log('⏳ Working...');
    try {
      var r = await fetch(endpoint, { method: 'POST', headers: { 'x-csrf-token': token } });
      var d = await r.json();
      console.log(d.success ? '✅ ' + d.message : '❌ ' + (d.error || d.message));
      return d;
    } catch (e) {
      console.error('❌ Request failed:', e.message);
    }
  }

  // Extend existing CampusCare object (don't overwrite — notifications.js adds demoNotifications)
  window.CampusCare = window.CampusCare || {};
  window.CampusCare.showcase = function() { return stateCall('/api/admin/state/showcase'); };
  window.CampusCare.outbreak = function() { return stateCall('/api/admin/state/outbreak'); };
  window.CampusCare.clear = function() { return stateCall('/api/admin/state/clear-outbreak'); };
  window.CampusCare.naked = function() { return stateCall('/api/admin/state/naked', 'This will DELETE ALL DATA. Are you sure?'); };

  console.log('🔧 CampusCare tools loaded. Try: CampusCare.showcase() or CampusCare.demoNotifications()');
})();
