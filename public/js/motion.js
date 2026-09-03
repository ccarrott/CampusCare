/**
 * CampusCare — Motion bootstrap (Phase 30A)
 *
 * Thin wrapper over Motion One (global `Motion`, vendored at /vendor/motion/motion.js).
 * Provides opt-in entrance + hover animations, fully gated behind prefers-reduced-motion.
 * Elements only animate if they carry the class — nothing global is forced.
 *
 *   .reveal       → fade + rise into view (staggered within a common parent grid)
 *   .hover-lift   → gentle scale on hover (interactive cards)
 *
 * Never animates layout props — transform/opacity only.
 */
(function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Read motion tokens (fallbacks if CSS not loaded yet).
  function tokenSeconds(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!v) return fallback;
    return v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v);
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var M = window.Motion;

    // If reduced-motion or Motion failed to load: reveal elements are simply shown.
    if (reduced || !M || !M.inView || !M.animate) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.style.opacity = '1'; });
      return;
    }

    var dur = tokenSeconds('--motion-base', 0.32);

    // Entrance: fade + rise when scrolled into view. Hidden until then.
    document.querySelectorAll('.reveal').forEach(function (el) { el.style.opacity = '0'; });
    M.inView('.reveal', function (info) {
      var el = info.target || info; // Motion passes an entry-like object across versions
      M.animate(el, { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0px)'] },
        { duration: dur, easing: [0.22, 1, 0.36, 1] });
      return function () {}; // don't re-hide on exit
    }, { amount: 0.15 });

    // Hover lift on interactive cards.
    var liftDur = tokenSeconds('--motion-fast', 0.18);
    document.querySelectorAll('.hover-lift').forEach(function (el) {
      el.addEventListener('mouseenter', function () { M.animate(el, { transform: 'scale(1.02)' }, { duration: liftDur }); });
      el.addEventListener('mouseleave', function () { M.animate(el, { transform: 'scale(1)' }, { duration: liftDur }); });
    });
  });

  // Expose a tiny helper for later phases (spring transitions, fly-to, etc.)
  window.CampusCareMotion = {
    reduced: reduced,
    animate: function () { if (!reduced && window.Motion) return window.Motion.animate.apply(null, arguments); }
  };
})();
