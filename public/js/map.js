/* public/js/map.js — CampusCare Health Heatmap (Phase 30G, rebuilt)
 *
 * A pannable/zoomable MapLibre GL map of Gqeberha with a soft "cloud" density
 * heatmap of symptom reports. Rebuilt to be robust:
 *   - RASTER-tile basemap defined INLINE (no vector glyph/sprite fetch that can
 *     silently blank the map). MapTiler raster when a key exists; OSM fallback.
 *   - Waits for the container to have real dimensions before constructing.
 *   - Soft, feathered heatmap radius/opacity → clouded, fading vibe.
 *   - Zones outlined; click for a floating glass detail card + gentle fly-to.
 *   - Theme-aware (swaps raster tiles on light/dark). Reduced-motion aware.
 */
(function () {
  const el = document.getElementById('healthMap');
  if (!el || typeof maplibregl === 'undefined') {
    if (el) el.innerHTML = '<div class="map-fallback">Map library failed to load.</div>';
    return;
  }

  const cfg = window.__mapConfig || {};
  const key = (cfg.maptilerKey || '').trim();
  const center = cfg.center || [25.60, -33.95];
  const zoom = cfg.zoom || 11.4;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

  let period = cfg.period || '1m';
  let map;
  const detailEl = document.getElementById('mapZoneDetail');

  // ---- Basemap: inline raster style (bulletproof; pans/zooms natively) ----
  function rasterTiles() {
    if (key) {
      // MapTiler raster 256 tiles — light + dark variants.
      const style = isDark() ? 'streets-v2-dark' : 'streets-v2';
      return [`https://api.maptiler.com/maps/${style}/256/{z}/{x}/{y}.png?key=${key}`];
    }
    // Free OSM raster fallback (no key required).
    return isDark()
      ? ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
         'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png']
      : ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
         'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'];
  }

  function baseStyle() {
    return {
      version: 8,
      sources: {
        basemap: {
          type: 'raster',
          tiles: rasterTiles(),
          tileSize: 256,
          attribution: key ? '© MapTiler © OpenStreetMap' : '© OpenStreetMap © CARTO'
        }
      },
      layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }]
    };
  }

  // Soft brand ramp — the low stops are very translucent for a clouded fade.
  const HEAT_RAMP = [
    0.0,  'rgba(18,185,185,0)',
    0.1,  'rgba(18,185,185,0.25)',
    0.3,  'rgba(63,185,80,0.45)',
    0.5,  'rgba(255,204,0,0.6)',
    0.75, 'rgba(245,166,35,0.75)',
    1.0,  'rgba(229,72,77,0.9)'
  ];

  function emptyFC() { return { type: 'FeatureCollection', features: [] }; }
  function fetchJSON(url) { return fetch(url, { headers: { 'x-csrf-token': csrf } }).then(r => r.json()); }

  function addDataLayers() {
    if (map.getSource('reports')) return; // already added (after a style swap)

    map.addSource('reports', { type: 'geojson', data: emptyFC() });
    map.addLayer({
      id: 'reports-heat',
      type: 'heatmap',
      source: 'reports',
      paint: {
        'heatmap-weight': ['get', 'weight'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 1, 14, 3],
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], ...HEAT_RAMP],
        // Big, feathered radius → soft cloud look that fades at the edges.
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 40, 12, 64, 15, 100],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.85, 15, 0.7]
      }
    });

    // Invisible suburb hit-layer (Voronoi). No permanent boundaries drawn — the
    // heat cloud is the only visible layer. On hover, the ONE suburb under the
    // cursor gets a whisper-faint tint + soft outline so you can see what you'll
    // click, then a label chip follows the cursor.
    map.addSource('zones', { type: 'geojson', data: emptyFC(), promoteId: 'zoneId' });
    // Fully invisible hit-layer — no tint, no border ever. The heat cloud is the
    // only visible layer; the cursor chip provides the suburb feedback. This keeps
    // the map clean and hides the (imprecise) Voronoi cell shapes entirely.
    map.addLayer({
      id: 'zones-fill',
      type: 'fill',
      source: 'zones',
      paint: { 'fill-color': 'rgba(0,0,0,0)', 'fill-opacity': 0 }
    });

    wireInteractions();
    reload();
  }

  function reload() {
    fetchJSON(`/trends/api/heatmap?period=${period}`)
      .then(fc => {
        if (!map.getSource('reports')) return;
        map.getSource('reports').setData(fc);
        // Normalise intensity by dataset size so long periods (many points) don't
        // over-saturate to solid red. More points → lower per-point intensity.
        const n = (fc.features || []).length;
        const scale = n <= 40 ? 1 : Math.max(0.4, 40 / n);
        if (map.getLayer('reports-heat')) {
          map.setPaintProperty('reports-heat', 'heatmap-intensity',
            ['interpolate', ['linear'], ['zoom'], 9, 1 * scale, 14, 3 * scale]);
        }
      })
      .catch(() => {});
    fetchJSON(`/trends/api/zones?period=${period}`)
      .then(fc => { if (map.getSource('zones')) map.getSource('zones').setData(fc); })
      .catch(() => {});
  }

  function renderDetail(props, centroid) {
    if (!detailEl) return;
    let top = '';
    try {
      const syms = typeof props.topSymptoms === 'string' ? JSON.parse(props.topSymptoms) : props.topSymptoms;
      if (syms && syms.length) {
        top = '<ul class="zone-detail-symptoms">' +
          syms.map(s => `<li><span>${s.name}</span><em>${s.count}</em></li>`).join('') + '</ul>';
      }
    } catch (e) {}
    detailEl.innerHTML =
      `<div class="zone-detail-head"><strong>${props.name}</strong>${props.outbreak ? '<span class="zone-flag">Outbreak</span>' : ''}</div>
       <div class="zone-detail-stats">
         <div><b>${props.totalReports}</b><span>reports</span></div>
         <div><b>${props.highReports}</b><span>high severity</span></div>
       </div>
       ${top || '<p class="text-muted" style="margin:0;">No symptom breakdown.</p>'}`;
    detailEl.classList.add('is-visible');
    if (centroid && !reduceMotion) map.flyTo({ center: centroid, zoom: 13, speed: 0.7, curve: 1.4, essential: true });
  }

  function polyCentroid(feature) {
    const g = feature.geometry;
    // Polygon: coordinates[0] is the outer ring. MultiPolygon: coordinates[0][0].
    const ring = g.type === 'MultiPolygon' ? g.coordinates[0][0] : g.coordinates[0];
    let x = 0, y = 0;
    ring.forEach(p => { x += p[0]; y += p[1]; });
    return [x / ring.length, y / ring.length];
  }

  // Floating label chip that follows the cursor: "Suburb — N reports".
  let chip = null;
  function ensureChip() {
    if (chip) return chip;
    chip = document.createElement('div');
    chip.className = 'map-hover-chip';
    el.appendChild(chip);
    return chip;
  }
  function moveChip(pt, props) {
    const c = ensureChip();
    const n = props.totalReports || 0;
    c.innerHTML = `<strong>${props.name}</strong><span>${n} report${n === 1 ? '' : 's'}${props.outbreak ? ' · outbreak' : ''}</span>`;
    c.classList.toggle('is-outbreak', !!props.outbreak);
    // Position within the map container; nudge so it doesn't sit under the pointer.
    c.style.left = (pt.x + 14) + 'px';
    c.style.top = (pt.y + 14) + 'px';
    c.classList.add('is-visible');
  }
  function hideChip() { if (chip) chip.classList.remove('is-visible'); }

  function wireInteractions() {
    map.on('click', 'zones-fill', (e) => {
      const f = e.features && e.features[0];
      if (f) renderDetail(f.properties, f.geometry && polyCentroid(f));
    });
    map.on('mousemove', 'zones-fill', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features && e.features[0];
      if (f) moveChip(e.point, f.properties);
    });
    map.on('mouseleave', 'zones-fill', () => {
      map.getCanvas().style.cursor = '';
      hideChip();
    });
  }

  function showError(msg) {
    var b = document.createElement('div');
    b.className = 'map-fallback';
    b.textContent = 'Map error: ' + msg;
    el.appendChild(b);
    console.error('[HealthMap] ' + msg);
  }

  function buildMap() {
    // WebGL availability check — the #1 reason a MapLibre canvas stays blank.
    try {
      var testCanvas = document.createElement('canvas');
      var gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) { showError('WebGL is not available in this browser/session.'); return; }
    } catch (e) { showError('WebGL check failed: ' + e.message); return; }

    if (!maplibregl.supported || maplibregl.supported()) { /* ok */ }
    else { showError('MapLibre reports WebGL unsupported.'); return; }

    try {
    map = new maplibregl.Map({
      container: 'healthMap',
      style: baseStyle(),
      center,
      zoom,
      minZoom: 9,
      maxZoom: 17,
      dragRotate: false,
      attributionControl: { compact: true }
    });
    } catch (err) { showError(err.message); return; }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.dragPan.enable();
    map.scrollZoom.enable();

    map.on('load', function () { map.resize(); addDataLayers(); });
    map.on('error', function (e) {
      console.error('[HealthMap] MapLibre error:', e && e.error ? e.error.message : e);
    });

    // Period selector.
    document.querySelectorAll('[data-map-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        period = btn.getAttribute('data-map-period');
        document.querySelectorAll('[data-map-period]').forEach(b => b.classList.toggle('active', b === btn));
        reload();
      });
    });

    // Theme swap: replace the basemap tiles in place (keep data layers).
    new MutationObserver(muts => {
      for (const m of muts) if (m.attributeName === 'data-theme') {
        const src = map.getSource('basemap');
        if (src && src.setTiles) src.setTiles(rasterTiles());
      }
    }).observe(document.documentElement, { attributes: true });

    window.CampusCareMap = { reload, map: () => map };
  }

  // Only construct once the container actually has a size (avoids 0×0 WebGL init).
  function whenSized(node, cb, tries) {
    tries = tries == null ? 40 : tries;
    if (node.offsetWidth > 0 && node.offsetHeight > 0) return cb();
    if (tries <= 0) return cb(); // give up waiting — construct anyway
    requestAnimationFrame(() => whenSized(node, cb, tries - 1));
  }

  whenSized(el, buildMap);
})();
