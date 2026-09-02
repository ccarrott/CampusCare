/**
 * CampusCare — Browser Notification System
 * 
 * Polls /consultations/api/upcoming for appointments and fires notifications at:
 * - 15 minutes before
 * - 5 minutes before
 * - 1 minute before
 * 
 * Uses Web Notification API. Requires user permission.
 * 
 * DEMO MODE: Run CampusCare.demoNotifications() in browser console to simulate.
 */

(function() {
  var sentNotifications = new Set();
  var STORAGE_KEY = 'campuscare_sent_notifications';

  // Load sent history
  try {
    var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    stored.forEach(function(id) { sentNotifications.add(id); });
  } catch (e) {}

  function saveSent() {
    var arr = Array.from(sentNotifications).slice(-100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  // Request permission
  function requestPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // Fire a notification. If joinUrl is provided, clicking the notification opens it.
  function sendNotification(title, body, tag, joinUrl) {
    if (!('Notification' in window)) { console.log('[Notification]', title, '-', body); return; }
    if (Notification.permission !== 'granted') { console.log('[Notification blocked]', title); return; }
    if (sentNotifications.has(tag)) return;

    var n = new Notification(title, {
      body: body + (joinUrl ? ' — click to join.' : ''),
      tag: tag,
      requireInteraction: true,
      icon: '/images/nmu-logo.jpg'
    });

    if (joinUrl) {
      n.onclick = function() {
        window.focus();
        window.open(joinUrl, '_blank');
        n.close();
      };
    }

    sentNotifications.add(tag);
    saveSent();

    setTimeout(function() { n.close(); }, 30000);
    console.log('[Notification sent]', title, '-', body);
  }

  // Check appointments and fire at thresholds
  async function checkAppointments() {
    try {
      var resp = await fetch('/consultations/api/upcoming');
      if (!resp.ok) return;

      var data = await resp.json();
      if (!data.appointments || data.appointments.length === 0) return;

      data.appointments.forEach(function(apt) {
        processAppointment(apt);
      });
    } catch (e) {}
  }

  function processAppointment(apt) {
    var mins = apt.minutesUntil;
    var withPerson = apt.with;
    var timeStr = new Date(apt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    var typeLabel = apt.type === 'Online' ? 'Online (Video)' : 'In-Person';
    // Offer a clickable join link only for online appointments with a ready room.
    var joinUrl = (apt.type === 'Online' && apt.joinUrl) ? apt.joinUrl : null;

    // 1 minute before (0 to 2 min)
    if (mins >= 0 && mins <= 2) {
      sendNotification(
        'Starting in 1 minute!',
        typeLabel + ' with ' + withPerson + ' at ' + timeStr,
        '1min_' + apt.id,
        joinUrl
      );
    }
    // 5 minutes before (4 to 6 min)
    else if (mins >= 4 && mins <= 6) {
      sendNotification(
        'Appointment in 5 minutes',
        typeLabel + ' with ' + withPerson + ' at ' + timeStr + '. Get ready!',
        '5min_' + apt.id,
        joinUrl
      );
    }
    // 15 minutes before (14 to 16 min)
    else if (mins >= 14 && mins <= 16) {
      sendNotification(
        'Appointment in 15 minutes',
        typeLabel + ' with ' + withPerson + ' at ' + timeStr + '. Prepare now.',
        '15min_' + apt.id,
        joinUrl
      );
    }
  }

  // ========================================================================
  // DEMO / SHOWCASE MODE
  // Run: CampusCare.demoNotifications() from browser console
  // ========================================================================

  window.CampusCare = window.CampusCare || {};

  window.CampusCare.demoNotifications = function() {
    // Clear sent history so demos always fire
    sentNotifications.clear();
    localStorage.removeItem(STORAGE_KEY);

    console.log('🔔 Demo: Simulating 3 notifications (15min → 5min → 1min)...');

    // Simulate 15-minute notification
    setTimeout(function() {
      sendNotification(
        'Appointment in 15 minutes',
        'In-Person with Sarah Jenkins at ' + formatFutureTime(15) + '. Prepare now.',
        'demo_15min'
      );
    }, 1000);

    // Simulate 5-minute notification
    setTimeout(function() {
      sendNotification(
        'Appointment in 5 minutes',
        'Online (Video) with David Khumalo at ' + formatFutureTime(5) + '. Get ready!',
        'demo_5min'
      );
    }, 4000);

    // Simulate 1-minute notification
    setTimeout(function() {
      sendNotification(
        'Starting in 1 minute!',
        'In-Person with Thandiwe Nkosi at ' + formatFutureTime(1),
        'demo_1min'
      );
    }, 7000);

    return '3 notifications will fire over the next 7 seconds.';
  };

  function formatFutureTime(minsFromNow) {
    var d = new Date(Date.now() + minsFromNow * 60000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Initialize
  requestPermission();
  checkAppointments();

  // Poll every 60 seconds (more responsive for 1/5/15 min triggers)
  setInterval(checkAppointments, 60 * 1000);
})();
