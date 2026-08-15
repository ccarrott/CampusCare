/**
 * CampusCare Admin Tools — Browser Console Helper
 * Usage (while logged in as admin):
 *   CampusCare.showcase()   — Load full demo data
 *   CampusCare.outbreak()   — Simulate outbreak in Central zone
 *   CampusCare.clear()      — Remove outbreak data
 *   CampusCare.naked()      — Nuclear reset (fresh deployment)
 */
window.CampusCare = {
  async showcase() {
    console.log('⏳ Loading showcase state...');
    const r = await fetch('/api/admin/state/showcase', { method: 'POST' });
    const d = await r.json();
    console.log(d.success ? '✅ ' + d.message : '❌ ' + d.message);
    return d;
  },
  async outbreak() {
    console.log('⏳ Simulating outbreak...');
    const r = await fetch('/api/admin/state/outbreak', { method: 'POST' });
    const d = await r.json();
    console.log(d.success ? '✅ ' + d.message : '❌ ' + d.message);
    return d;
  },
  async clear() {
    console.log('⏳ Clearing outbreak data...');
    const r = await fetch('/api/admin/state/clear-outbreak', { method: 'POST' });
    const d = await r.json();
    console.log(d.success ? '✅ ' + d.message : '❌ ' + d.message);
    return d;
  },
  async naked() {
    if (!confirm('This will DELETE ALL DATA. Are you sure?')) return;
    console.log('⏳ Resetting to naked state...');
    const r = await fetch('/api/admin/state/naked', { method: 'POST' });
    const d = await r.json();
    console.log(d.success ? '✅ ' + d.message : '❌ ' + d.message);
    return d;
  }
};
console.log('🔧 CampusCare admin tools loaded. Try: CampusCare.showcase()');
