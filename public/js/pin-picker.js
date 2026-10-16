/* public/js/pin-picker.js — CampusCare location pin-drop (MapLibre GL)
 *
 * A minimal "drop a pin where you stay" picker, reused by the first-time
 * location page and the profile edit page. Replaces the retired Leaflet picker
 * (Phase 30G: MapLibre is the single map library).
 *
 * Reads window.__pinConfig:
 *   { maptilerKey, container, latInput, lonInput, saveBtn, infoBox, zoneLabel,
 *     currentLat, currentLon }
 *
 * Click (or drag the marker) to set the pin → fills the hidden lat/lon inputs,
 * enables the Save button, and shows a small "Location set" confirmation. Zone
 * resolution happens server-side on save (profile.controller.saveLocation), so
 * the client only needs the coordinates.
 */
(function () {
  const cfg = window.__pinConfig || {};
  const el = document.getElementById(cfg.container);
  if (!el) return;

  if (typeof maplibregl === 'undefined') {
    el.innerHTML = '<div class="map-fallback">Map library failed to load. Check your connection and refresh.</div>';
    return;
  }

  const latInput = document.getElementById(cfg.latInput);
  const lonInput = document.getElementById(cfg.lonInput);
  const saveBtn = document.getElementById(cfg.saveBtn);
  const infoBox = cfg.infoBox ? document.getElementById(cfg.infoBox) : null;
  const zoneLabel = cfg.zoneLabel ? document.getElementById(cfg.zoneLabel) : null;

  // Empty OR the .env.example placeholder → treat as "no key" and use the free
  // OSM/CARTO basemap, instead of calling MapTiler with a junk key and getting
  // greyed "no API key" watermark tiles.
  const rawKey = (cfg.maptilerKey || '').trim();
  let key = rawKey === 'your_maptiler_key' ? '' : rawKey;
  let maptilerFailed = false;
  const GQEBERHA = [25.6600, -33.9855]; // [lon, lat] — MapLibre order
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

  // Raster basemap, inline — same bulletproof approach as the trends map
  // (no vector glyph/sprite fetch that can silently blank the canvas).
  function rasterTiles() {
    if (key && !maptilerFailed) {
      const style = isDark() ? 'streets-v2-dark' : 'streets-v2';
      return [`https://api.maptiler.com/maps/${style}/256/{z}/{x}/{y}.png?key=${key}`];
    }
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

  function fail(msg) {
    const b = document.createElement('div');
    b.className = 'map-fallback';
    b.textContent = 'Map error: ' + msg;
    el.appendChild(b);
    console.error('[PinPicker] ' + msg);
  }

  const hasPin = cfg.currentLat != null && cfg.currentLon != null;
  const startCenter = hasPin ? [Number(cfg.currentLon), Number(cfg.currentLat)] : GQEBERHA;

  let map;
  let marker = null;

  function setPin(lon, lat) {
    if (!marker) {
      marker = new maplibregl.Marker({ draggable: true, color: '#e5484d' })
        .setLngLat([lon, lat])
        .addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLngLat();
        writeInputs(p.lng, p.lat);
      });
    } else {
      marker.setLngLat([lon, lat]);
    }
    writeInputs(lon, lat);
  }

  function writeInputs(lon, lat) {
    if (latInput) latInput.value = Number(lat).toFixed(7);
    if (lonInput) lonInput.value = Number(lon).toFixed(7);
    if (saveBtn) saveBtn.disabled = false;
    if (infoBox) infoBox.style.display = 'block';
    resolveZone(lat, lon);
  }

  // Ask the server which suburb/zone the pin falls in (single source of truth —
  // profile.controller.zoneAt → getZoneForPoint). Show the real name, or a
  // neutral confirmation if it's outside all zones or the lookup fails.
  let zoneReq = 0;
  function resolveZone(lat, lon) {
    if (!zoneLabel) return;
    const myReq = ++zoneReq;           // guard against out-of-order responses
    zoneLabel.textContent = 'Finding suburb…';
    fetch(`/profile/zone-at?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
          { headers: { 'Accept': 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('lookup failed')))
      .then(data => {
        if (myReq !== zoneReq) return;  // a newer pin superseded this one
        zoneLabel.textContent = data && data.name ? data.name : 'Pin placed';
      })
      .catch(() => { if (myReq === zoneReq) zoneLabel.textContent = 'Pin placed'; });
  }

  function build() {
    try {
      const test = document.createElement('canvas');
      const gl = test.getContext('webgl2') || test.getContext('webgl') || test.getContext('experimental-webgl');
      if (!gl) { fail('WebGL is not available in this browser/session.'); return; }
    } catch (e) { fail('WebGL check failed: ' + e.message); return; }

    try {
      map = new maplibregl.Map({
        container: cfg.container,
        style: baseStyle(),
        center: startCenter,
        zoom: hasPin ? 14 : 12.5,
        minZoom: 9,
        maxZoom: 18,
        dragRotate: false,
        attributionControl: { compact: true }
      });
    } catch (err) { fail(err.message); return; }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      map.resize();
      if (hasPin) setPin(Number(cfg.currentLon), Number(cfg.currentLat));
    });

    map.on('error', (e) => {
      const msg = e && e.error ? e.error.message : '';
      // Bad/placeholder/stale key, quota, or offline → fall back to free OSM
      // tiles once rather than show MapTiler's "no API key" overlay.
      if (!maptilerFailed && key && /api\.maptiler\.com/.test(msg)) {
        maptilerFailed = true;
        const src = map.getSource('basemap');
        if (src && src.setTiles) { console.warn('[PinPicker] MapTiler tiles failed — falling back to OSM.'); src.setTiles(rasterTiles()); }
      }
    });

    map.on('click', (e) => setPin(e.lngLat.lng, e.lngLat.lat));

    addLocateButton();

    // Theme swap: replace basemap tiles in place.
    new MutationObserver((muts) => {
      for (const m of muts) if (m.attributeName === 'data-theme') {
        const src = map.getSource('basemap');
        if (src && src.setTiles) src.setTiles(rasterTiles());
      }
    }).observe(document.documentElement, { attributes: true });
  }

  // "Use my location" — HTML5 geolocation drops the pin at the device position.
  // Permissions-Policy already allows geolocation=(self). Floating glass control.
  function addLocateButton() {
    if (!navigator.geolocation) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-locate-btn';
    btn.setAttribute('aria-label', 'Use my current location');
    btn.innerHTML = '<span aria-hidden="true">📍</span> Use my location';
    el.appendChild(btn);

    btn.addEventListener('click', () => {
      btn.disabled = true;
      const prev = btn.innerHTML;
      btn.innerHTML = 'Locating…';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.flyTo({ center: [longitude, latitude], zoom: 15, essential: true });
          setPin(longitude, latitude);
          btn.disabled = false;
          btn.innerHTML = prev;
        },
        () => {
          btn.disabled = false;
          btn.innerHTML = prev;
          if (zoneLabel) zoneLabel.textContent = 'Could not get your location — tap the map instead.';
          if (infoBox) infoBox.style.display = 'block';
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  // Construct only once the container has real dimensions (avoids 0×0 WebGL init).
  function whenSized(node, cb, tries) {
    tries = tries == null ? 40 : tries;
    if (node.offsetWidth > 0 && node.offsetHeight > 0) return cb();
    if (tries <= 0) return cb();
    requestAnimationFrame(() => whenSized(node, cb, tries - 1));
  }

  whenSized(el, build);
})();
