// src/modules/appointments/webhook.controller.js
// Phase 28: Daily.co webhook auditor.
// Receives room events and records attendance + duration in ConsultationSession.
//
// SECURITY: this endpoint is public (Daily calls it), so it is NOT session/CSRF
// protected. Instead it is gated by a shared secret. We accept either:
//   (a) ?secret=<DAILY_WEBHOOK_SECRET> query param, or an X-Webhook-Secret header, OR
//   (b) an HMAC-SHA256 signature (X-Webhook-Signature) over the raw body, if present.
// Requests that satisfy neither are rejected with 401.

import crypto from 'crypto';
import { catchAsync } from '../../utils/catchAsync.js';
import * as AppointmentsModel from './appointments.model.js';

function constantTimeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isAuthorized(req) {
  const secret = process.env.DAILY_WEBHOOK_SECRET;
  if (!secret) return false;

  // (a) shared-secret via header or query param
  const provided = req.headers['x-webhook-secret'] || req.query.secret;
  if (provided && constantTimeEqual(provided, secret)) return true;

  // (b) HMAC signature over the raw JSON body (best-effort; body is already parsed)
  const signature = req.headers['x-webhook-signature'];
  if (signature) {
    const raw = JSON.stringify(req.body || {});
    const digest = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (constantTimeEqual(signature, digest)) return true;
  }

  return false;
}

/**
 * Daily posts an event envelope. We normalise a few field shapes since Daily's
 * payloads vary by event type; the fields we need are room_name, event type,
 * participant user_name, and timestamps.
 */
export const handleDailyWebhook = catchAsync(async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized webhook.' });
  }

  const body = req.body || {};

  // Daily sends a verification "test" ping when a webhook is first configured.
  if (body.test || body.type === 'webhook.test') {
    return res.status(200).json({ ok: true });
  }

  const type = body.type || body.event;
  const payload = body.payload || body;
  const roomName = payload.room || payload.room_name;
  if (!roomName) return res.status(200).json({ ok: true, ignored: 'no room' });

  const apt = await AppointmentsModel.getAppointmentByRoomName(roomName);
  if (!apt) return res.status(200).json({ ok: true, ignored: 'no appointment' });

  // A stable session id per room instance (roomName is unique per appointment room).
  const sessionId = 'CS-' + roomName;
  const nowIso = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
  const tsToSql = (unix) => unix
    ? new Date(unix * 1000).toISOString().slice(0, 19).replace('T', ' ')
    : nowIso();

  await AppointmentsModel.upsertConsultationSession(sessionId, apt.AppointmentID, roomName);

  switch (type) {
    case 'meeting.started': {
      await AppointmentsModel.markSessionStarted(sessionId, tsToSql(payload.start_ts));
      break;
    }
    case 'participant.joined': {
      // Token user_name is prefixed "Nurse: ..." or "Patient: ..." by room.service.
      const userName = (payload.user_name || '');
      // Whitelist: only ever one of these two exact column names reaches the query.
      const safeColumn = userName.startsWith('Nurse') ? 'NurseJoinedAt' : 'StudentJoinedAt';
      await AppointmentsModel.markParticipantJoined(sessionId, safeColumn, tsToSql(payload.joined_at));
      break;
    }
    case 'meeting.ended': {
      const endedUnix = payload.end_ts;
      const startedUnix = payload.start_ts;
      const duration = (endedUnix && startedUnix)
        ? Math.max(0, endedUnix - startedUnix)
        : (payload.duration || null);
      await AppointmentsModel.markSessionEnded(sessionId, tsToSql(endedUnix), duration);
      break;
    }
    default:
      // participant.left and other events are acknowledged but not specially handled.
      break;
  }

  res.status(200).json({ ok: true });
});
