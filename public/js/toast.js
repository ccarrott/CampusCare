/**
 * CampusCare - Toast Notification System
 * Shows floating success/error/info messages that auto-dismiss.
 * Triggered by ?toast= URL parameter or called directly via showToast().
 */
(function() {
  // Show a toast notification
  window.showToast = function(message, type) {
    type = type || 'success';
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger slide-in
    requestAnimationFrame(function() {
      toast.classList.add('toast-visible');
    });

    // Auto-dismiss after 4 seconds
    setTimeout(function() {
      toast.classList.remove('toast-visible');
      setTimeout(function() { toast.remove(); }, 300);
    }, 4000);
  };

  // Check for toast query parameter on page load
  var params = new URLSearchParams(window.location.search);
  var toastMsg = params.get('toast');
  var toastType = params.get('toastType') || 'success';

  if (toastMsg) {
    showToast(decodeURIComponent(toastMsg), toastType);
    // Clean the URL without reload
    var url = new URL(window.location);
    url.searchParams.delete('toast');
    url.searchParams.delete('toastType');
    window.history.replaceState({}, '', url.pathname + url.search);
  }
})();
