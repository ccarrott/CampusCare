/* Spotlight — a soft light that follows the cursor across glass surfaces and
   fades in *before* the cursor reaches a block (proximity ramp). No library.
   For each in-scope card we inject a `.spotlight` overlay div. A single
   document-level pointermove (rAF-throttled) updates every card: the highlight
   is centred on the cursor (in the card's local space) and its intensity
   ramps from 0 at PROXIMITY px away up to full when the cursor is inside.
   Skips touch pointers and reduced-motion. */
(function () {
  'use strict';

  var SELECTOR = '.content-card, .dash-hero:not(.dash-hero--bare), .stat-tile, .glass-note, .staff-card, .auth-card, .sidebar';
  var PROXIMITY = 180;   // px: how far away the glow starts fading in

  function start() {
    var mq = window.matchMedia;
    if (mq && (mq('(pointer: coarse)').matches || mq('(prefers-reduced-motion: reduce)').matches)) {
      return;
    }

    var cards = [];

    document.querySelectorAll(SELECTOR).forEach(function (card) {
      if (card.classList.contains('content-card--solid')) return;
      if (card.querySelector(':scope > .spotlight')) return;
      var spot = document.createElement('div');
      spot.className = 'spotlight';
      spot.setAttribute('aria-hidden', 'true');
      card.insertBefore(spot, card.firstChild);
      cards.push({ card: card, spot: spot, glow: 0 });
    });

    if (!cards.length) return;

    var mx = 0, my = 0, raf = 0;

    function update() {
      raf = 0;
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var r = c.card.getBoundingClientRect();
        if (!r.width || !r.height) { continue; }

        // Cursor position local to the card (for the gradient centre).
        c.spot.style.setProperty('--spot-x', (mx - r.left).toFixed(1) + 'px');
        c.spot.style.setProperty('--spot-y', (my - r.top).toFixed(1) + 'px');

        // Distance from the cursor to the card's nearest edge (0 when inside).
        var dx = mx < r.left ? r.left - mx : (mx > r.right ? mx - r.right : 0);
        var dy = my < r.top ? r.top - my : (my > r.bottom ? my - r.bottom : 0);
        var dist = Math.sqrt(dx * dx + dy * dy);

        // Proximity ramp: 1 inside → 0 at PROXIMITY away.
        var glow = dist <= 0 ? 1 : Math.max(0, 1 - dist / PROXIMITY);
        if (glow !== c.glow) {
          c.glow = glow;
          c.spot.style.setProperty('--glow', glow.toFixed(3));
        }
      }
    }

    document.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });

    // Recompute on scroll so proximity stays correct as the page moves.
    window.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
