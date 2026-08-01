/**
 * CampusCare - Browser Notification System
 * 
 * Polls the server for upcoming appointments and fires browser notifications:
 * - 24 hours before
 * - 1 hour before
 * - When the meeting is starting (0 minutes)
 * 
 * Uses the Web Notification API. Requires user permission grant.
 */

(function () {
  // Track which notifications have already been sent (prevent duplicates)
  const sentNotifications = new Set();
  const STORAGE_KEY = 'campuscare_sent_notifications';

  // Load previously sent notifications from localStorage
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    stored.forEach(id => sentNotifications.add(id));
  } catch (e) { /* ignore */ }

  function saveSentNotifications() {
    // Only keep last 50 entries to prevent unbounded growth
    const arr = Array.from(sentNotifications).slice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  // Request notification permission on first load
  function requestPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // Send a browser notification
  function sendNotification(title, body, tag) {
    if (Notification.permission !== 'granted') return;
    if (sentNotifications.has(tag)) return; // already sent

    const notification = new Notification(title, {
      body: body,
      icon: '/css/style.css', // no real icon, browser will use default
      tag: tag, // prevents duplicate browser notifications
      requireInteraction: true
    });

    sentNotifications.add(tag);
    saveSentNotifications();

    // Auto-close after 30 seconds
    setTimeout(() => notification.close(), 30000);
  }

  // Check appointments and fire notifications
  async function checkAppointments() {
    try {
      const resp = await fetch('/consultations/api/upcoming');
      if (!resp.ok) return;

      const data = await resp.json();
      if (!data.appointments || data.appointments.length === 0) return;

      for (const apt of data.appointments) {
        const mins = apt.minutesUntil;
        const withPerson = apt.with;
        const timeStr = new Date(apt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const typeLabel = apt.type === 'Online' ? 'Online (Teams)' : 'In-Person';

        // Starting now or just started (up to 15 min ago)
        if (mins >= -15 && mins <= 5) {
          sendNotification(
            mins < 0 ? 'Your appointment has started!' : 'Your appointment is starting now!',
            `${typeLabel} consultation with ${withPerson} at ${timeStr}`,
            `start_${apt.id}`
          );
        }
        // 1 hour before (55-65 minutes)
        else if (mins >= 55 && mins <= 65) {
          sendNotification(
            'Appointment in 1 hour',
            `${typeLabel} with ${withPerson} at ${timeStr}. Get ready!`,
            `1h_${apt.id}`
          );
        }
        // 24 hours before (1430-1450 minutes)
        else if (mins >= 1430 && mins <= 1450) {
          sendNotification(
            'Appointment tomorrow',
            `${typeLabel} with ${withPerson} tomorrow at ${timeStr}`,
            `24h_${apt.id}`
          );
        }
      }
    } catch (e) {
      // Silently fail - notifications are non-critical
    }
  }

  // Initialize
  requestPermission();

  // Check immediately on page load
  checkAppointments();

  // Poll every 5 minutes
  setInterval(checkAppointments, 5 * 60 * 1000);
})();
