// Dark Mode Toggle
(function() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  const STORAGE_KEY = 'campuscare_theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Icon visibility is driven by CSS off [data-theme] — no text to set.
    localStorage.setItem(STORAGE_KEY, theme);
  }

  // Load saved preference, or use system preference
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    applyTheme(saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  } else {
    applyTheme('light');
  }

  toggle.addEventListener('click', function() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
})();
