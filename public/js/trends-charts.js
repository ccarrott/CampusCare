/* public/js/trends-charts.js — Chart.js visuals for the Health Trends page (Phase 30G)
 * Timeline (line), severity split (doughnut), category breakdown (doughnut).
 * Theme-aware, brand palette, calm styling per design-refs (thin gridlines, muted axes). */
(function () {
  if (typeof Chart === 'undefined' || !window.__trendData) return;
  const T = window.__trendData;

  const css = (v, fb) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fb;
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = () => (isDark() ? '#cbd5e1' : '#334155');
  const gridColor = () => (isDark() ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)');

  const YELLOW = '#ffcc00', AMBER = '#f5a623', RED = '#e5484d', GREEN = '#3fb950', TEAL = '#12b9b9', BLUE = '#132e51';
  const CAT_COLORS = [BLUE, TEAL, YELLOW, AMBER, RED, '#8b5cf6', '#ec4899', '#0ea5e9'];

  Chart.defaults.font.family = "'Cantarell', system-ui, sans-serif";
  Chart.defaults.plugins.legend.labels.boxWidth = 14;
  Chart.defaults.plugins.legend.labels.padding = 16;

  const charts = [];

  // ---- Timeline (fill gaps in the day series) ----
  (function timeline() {
    const c = document.getElementById('timelineChart');
    if (!c) return;
    const rows = T.timeline || [];
    let labels = rows.map(r => r.day);
    let reports = rows.map(r => r.reports);
    let high = rows.map(r => r.high);
    if (!rows.length) { labels = ['']; reports = [0]; high = [0]; }

    const grad = (() => {
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 0, 220);
      g.addColorStop(0, 'rgba(255,204,0,0.35)');
      g.addColorStop(1, 'rgba(255,204,0,0)');
      return g;
    })();

    charts.push(new Chart(c, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'All reports', data: reports, borderColor: YELLOW, backgroundColor: grad,
            fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
          { label: 'High severity', data: high, borderColor: RED, backgroundColor: 'transparent',
            fill: false, tension: 0.4, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2, borderDash: [4, 3] }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor(), maxTicksLimit: 8, font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: gridColor() }, ticks: { color: textColor(), precision: 0 } }
        },
        plugins: { legend: { labels: { color: textColor() } } }
      }
    }));
  })();

  // ---- Severity doughnut ----
  (function severity() {
    const c = document.getElementById('severityChart');
    if (!c) return;
    const s = T.severity || { Low: 0, Moderate: 0, High: 0 };
    charts.push(new Chart(c, {
      type: 'doughnut',
      data: {
        labels: ['Low', 'Moderate', 'High'],
        datasets: [{ data: [s.Low, s.Moderate, s.High], backgroundColor: [GREEN, YELLOW, RED],
          borderWidth: 2, borderColor: isDark() ? '#0b1120' : '#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: { legend: { position: 'bottom', labels: { color: textColor() } } }
      }
    }));
  })();

  // ---- Category doughnut ----
  (function category() {
    const c = document.getElementById('categoryChart');
    if (!c) return;
    const cat = T.categories || { labels: [], data: [] };
    charts.push(new Chart(c, {
      type: 'doughnut',
      data: {
        labels: cat.labels,
        datasets: [{ data: cat.data, backgroundColor: CAT_COLORS.slice(0, cat.labels.length),
          borderWidth: 2, borderColor: isDark() ? '#0b1120' : '#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '58%',
        plugins: { legend: { position: 'bottom', labels: { color: textColor() } } }
      }
    }));
  })();

  // Recolour text/grid on theme toggle (Chart.js needs an update to repaint labels).
  new MutationObserver(muts => {
    for (const m of muts) if (m.attributeName === 'data-theme') {
      charts.forEach(ch => {
        if (ch.options.scales) {
          if (ch.options.scales.x) ch.options.scales.x.ticks.color = textColor();
          if (ch.options.scales.y) { ch.options.scales.y.ticks.color = textColor(); ch.options.scales.y.grid.color = gridColor(); }
        }
        if (ch.options.plugins.legend.labels) ch.options.plugins.legend.labels.color = textColor();
        ch.update('none');
      });
    }
  }).observe(document.documentElement, { attributes: true });
})();
