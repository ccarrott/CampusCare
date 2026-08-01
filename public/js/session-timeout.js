// Session Timeout Warning — warns user 5 min before 1-hour expiry
(function() {
  const SESSION_DURATION = 60 * 60 * 1000; // 1 hour
  const WARNING_BEFORE = 5 * 60 * 1000; // 5 minutes
  const warningTime = SESSION_DURATION - WARNING_BEFORE;

  let warningShown = false;

  setTimeout(function() {
    if (warningShown) return;
    warningShown = true;

    const toast = document.createElement('div');
    toast.className = 'session-toast';
    toast.innerHTML = `
      <span>Your session expires in 5 minutes.</span>
      <button id="stayLoggedIn" class="btn btn-primary" style="padding: 4px 12px; font-size: 0.8rem; margin-left: 12px;">Stay logged in</button>
    `;
    document.body.appendChild(toast);

    document.getElementById('stayLoggedIn').addEventListener('click', function() {
      fetch('/auth/refresh-session').then(function() {
        toast.remove();
        warningShown = false;
        // Reset timer
        setTimeout(arguments.callee, warningTime);
      });
    });

    // Auto-dismiss after 30s
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 30000);
  }, warningTime);
})();
