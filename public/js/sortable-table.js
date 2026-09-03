/**
 * CampusCare — Sortable Tables
 *
 * Any <table class="data-table sortable"> gets clickable column sorting.
 * Mark a header cell with class "no-sort" (e.g. the actions column) to skip it.
 * Sorting is client-side over the currently rendered rows — no server round-trip.
 */
(function () {
  function cellText(row, index) {
    var cell = row.children[index];
    return cell ? cell.textContent.trim() : '';
  }

  function compare(a, b) {
    // Numeric-aware: pull leading numbers if both look numeric, else localeCompare.
    var na = parseFloat(a.replace(/[^0-9.\-]/g, ''));
    var nb = parseFloat(b.replace(/[^0-9.\-]/g, ''));
    var aNum = a !== '' && !isNaN(na) && /\d/.test(a);
    var bNum = b !== '' && !isNaN(nb) && /\d/.test(b);
    if (aNum && bNum && na !== nb) return na - nb;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  function sortBy(table, headerCells, colIndex, direction) {
    var tbody = table.querySelector('tbody');
    if (!tbody) return;
    var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));

    rows.sort(function (r1, r2) {
      var res = compare(cellText(r1, colIndex), cellText(r2, colIndex));
      return direction === 'asc' ? res : -res;
    });

    rows.forEach(function (r) { tbody.appendChild(r); });

    // Update header indicators
    headerCells.forEach(function (h) {
      h.classList.remove('sort-asc', 'sort-desc');
    });
    headerCells[colIndex].classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
  }

  function initTable(table) {
    var headerCells = Array.prototype.slice.call(table.querySelectorAll('thead th'));
    headerCells.forEach(function (th, index) {
      if (th.classList.contains('no-sort') || th.textContent.trim() === '') return;
      th.classList.add('sortable-th');
      th.setAttribute('role', 'button');
      th.setAttribute('tabindex', '0');

      var current = 'none';
      function toggle() {
        current = current === 'asc' ? 'desc' : 'asc';
        sortBy(table, headerCells, index, current);
      }
      th.addEventListener('click', toggle);
      th.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('table.data-table.sortable').forEach(initTable);
  });
})();
