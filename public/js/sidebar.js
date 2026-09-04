// Sidebar Toggle Logic — clicks on empty sidebar space toggle expand/collapse
(function() {
  const sidebar = document.getElementById('sidebar');
  const STORAGE_KEY = 'campuscare_sidebar_collapsed';

  // Load saved state
  const isCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
  if (isCollapsed) {
    sidebar.classList.add('collapsed');
  }

  // Toggle on click of sidebar itself, but NOT on links or buttons
  sidebar.addEventListener('click', function(e) {
    const target = e.target;
    // Don't toggle if clicking a link, button, or input
    if (target.closest('a') || target.closest('button') || target.closest('input')) {
      return;
    }
    sidebar.classList.toggle('collapsed');
    localStorage.setItem(STORAGE_KEY, sidebar.classList.contains('collapsed'));
  });
})();


// Expandable sidebar submenus — arrow button toggles, link navigates
document.querySelectorAll('.sidebar-arrow-btn').forEach(function(btn) {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const targetId = this.dataset.target;
    const submenu = document.getElementById(targetId);
    if (submenu) {
      submenu.classList.toggle('open');
      this.classList.toggle('expanded');
    }
  });
});


// Time-aware greeting
(function() {
  const el = document.getElementById('dashboardGreeting');
  if (!el) return;

  const firstName = el.dataset.firstname;
  const role = el.dataset.role;
  const hour = new Date().getHours();

  let greeting;
  if (role === 'admin') {
    greeting = 'System Administrator';
  } else if (hour >= 0 && hour < 5) {
    greeting = 'All nighter, ' + firstName + '?';
  } else if (hour >= 5 && hour < 12) {
    greeting = 'Good morning, ' + firstName;
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Good afternoon, ' + firstName;
  } else {
    greeting = 'Good evening, ' + firstName;
  }

  el.innerHTML = greeting;

  // Fit the greeting so it always spans ~half the container width, regardless
  // of how long the greeting text is. We measure at a reference font-size and
  // scale linearly (font width scales with font-size for a given string).
  const TARGET_RATIO = 0.58;  // a bit over half the page (container) width
  const REF_PX = 100;         // measure at 100px, then scale
  const MIN_PX = 40;
  const MAX_PX = 320;

  function fitGreeting() {
    const container = el.parentElement || el;
    const available = container.clientWidth;
    if (!available) return;

    const prevSize = el.style.fontSize;
    const prevWS = el.style.whiteSpace;
    el.style.whiteSpace = 'nowrap';
    el.style.fontSize = REF_PX + 'px';
    const refWidth = el.scrollWidth;
    el.style.fontSize = prevSize;
    el.style.whiteSpace = prevWS;
    if (!refWidth) return;

    let target = (available * TARGET_RATIO) * (REF_PX / refWidth);
    target = Math.max(MIN_PX, Math.min(MAX_PX, target));
    el.style.fontSize = target.toFixed(1) + 'px';
  }

  fitGreeting();
  let raf;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(fitGreeting);
  });
  // Refit once webfonts have loaded (WindSong metrics differ from fallback).
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitGreeting);
  }
})();


// Mobile drawer toggle
(function() {
  const btn = document.getElementById('mobileMenuBtn');
  const backdrop = document.getElementById('mobileBackdrop');
  const sidebar = document.getElementById('sidebar');
  if (!btn || !backdrop || !sidebar) return;

  btn.addEventListener('click', function() {
    sidebar.classList.add('mobile-open');
    backdrop.classList.add('visible');
  });

  backdrop.addEventListener('click', function() {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.remove('visible');
  });

  // Close drawer when a link is clicked (mobile)
  sidebar.querySelectorAll('a.sidebar-link').forEach(function(link) {
    link.addEventListener('click', function() {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('visible');
      }
    });
  });
})();

// Sidebar Active Link Highlight
(function() {
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(function(link) {
    const href = link.getAttribute('href');
    if (!href) return;
    // Exact match or starts-with (but not just '/')
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });
})();

// Prevent sidebar bounce animation on navigation (avoids visual glitch)
(function() {
  document.querySelectorAll('.sidebar-link').forEach(function(link) {
    link.addEventListener('click', function() {
      document.getElementById('sidebar').classList.add('navigating');
    });
  });
})();
