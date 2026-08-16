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
    const el = document.querySelector('input[name="_csrf"]');
    return el ? el.value : '';
  }

  async function stateCall(endpoint, confirmMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    const token = getCsrf();
    if (!token) { console.error('❌ No CSRF token found. Are you logged in?'); return; }
    console.log('⏳ Working...');
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'x-csrf-token': token } });
      const d = await r.json();
      console.log(d.success ? '✅ ' + d.message : '❌ ' + (d.error || d.message));
      return d;
    } catch (e) {
      console.error('❌ Request failed:', e.message);
    }
  }

  window.CampusCare = {
    showcase: () => stateCall('/api/admin/state/showcase'),
    outbreak: () => stateCall('/api/admin/state/outbreak'),
    clear: () => stateCall('/api/admin/state/clear-outbreak'),
    naked: () => stateCall('/api/admin/state/naked', 'This will DELETE ALL DATA. Are you sure?')
  };

  console.log('🔧 CampusCare admin tools loaded. Try: CampusCare.showcase()');
})();
