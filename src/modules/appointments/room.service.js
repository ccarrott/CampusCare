// src/modules/appointments/room.service.js
// Phase 28: Daily.co room lifecycle. Keeps controllers thin.
// A room is created lazily (on nurse confirm or first join), expires shortly
// after the appointment, and is torn down on cancel/complete/expiry.

import crypto from 'crypto';
import * as Daily from '../../utils/daily.js';
import * as AppointmentsModel from './appointments.model.js';
import { DAILY, ROLES } from '../../constants.js';

/** Unix seconds at which the room/token should expire for a given appointment time. */
function roomExpUnix(appointmentTime) {
  const end = new Date(appointmentTime).getTime() + DAILY.ROOM_BUFFER_AFTER_MIN * 60 * 1000;
  return Math.floor(end / 1000);
}

/** JS Date for the same expiry (for the RoomExp datetime column). */
function roomExpDate(appointmentTime) {
  return new Date(roomExpUnix(appointmentTime) * 1000);
}

/**
 * Ensures a Daily room exists for an online appointment. Idempotent.
 * Creates a fresh room if none exists OR the stored expiry has already passed.
 * Returns the up-to-date { roomName, roomUrl } (from the appointment or newly created).
 */
export async function ensureRoomForAppointment(appointment) {
  const now = Date.now();
  const storedExp = appointment.RoomExp ? new Date(appointment.RoomExp).getTime() : 0;
  const hasLiveRoom = appointment.RoomName && appointment.RoomUrl && storedExp > now;

  if (hasLiveRoom) {
    return { roomName: appointment.RoomName, roomUrl: appointment.RoomUrl };
  }

  // Opaque, PHI-free room name. Not derivable from AppointmentID.
  const roomName = 'consult-' + crypto.randomUUID();
  const expUnix = roomExpUnix(appointment.Time);

  const room = await Daily.createRoom(roomName, expUnix);
  const roomUrl = room.url; // Daily returns the full join URL

  await AppointmentsModel.setAppointmentRoom(appointment.AppointmentID, {
    roomName,
    roomUrl,
    roomExp: roomExpDate(appointment.Time)
  });

  // Reflect new values on the in-memory object for the caller.
  appointment.RoomName = roomName;
  appointment.RoomUrl = roomUrl;
  return { roomName, roomUrl };
}

/**
 * Mints a per-user meeting token. Nurse => owner (admits knockers, ends call).
 * Requires the appointment to already have a room (call ensureRoom first).
 */
export async function mintTokenForUser(appointment, user) {
  const isOwner = user.role === ROLES.NURSE;
  const displayName = (user.name && user.name.trim()) || (isOwner ? 'Nurse' : 'Patient');
  // Prefix the role so the webhook auditor can reliably attribute joins (Daily also
  // shows this name in the call UI, which is acceptable — no PHI beyond first/last name).
  const userName = `${isOwner ? 'Nurse' : 'Patient'}: ${displayName}`;
  const expUnix = roomExpUnix(appointment.Time);

  const token = await Daily.createMeetingToken({
    roomName: appointment.RoomName,
    userName,
    isOwner,
    expUnix
  });

  return { url: appointment.RoomUrl, token };
}

/**
 * On reschedule: move the room's expiry window to track the new time.
 * Simplest correct approach for ephemeral rooms = delete + recreate.
 */
export async function refreshRoomExpiry(appointment, newTime) {
  if (!appointment.RoomName) return; // no room yet — nothing to refresh
  await Daily.deleteRoom(appointment.RoomName);
  await AppointmentsModel.clearAppointmentRoom(appointment.AppointmentID);

  // Recreate against the new time so a live room is ready.
  const refreshed = { ...appointment, Time: newTime, RoomName: null, RoomUrl: null, RoomExp: null };
  await ensureRoomForAppointment(refreshed);
}

/** On cancel/complete/expire: delete the Daily room and null the columns. */
export async function teardownRoom(appointment) {
  if (!appointment.RoomName) return;
  await Daily.deleteRoom(appointment.RoomName);
  await AppointmentsModel.clearAppointmentRoom(appointment.AppointmentID);
}

/**
 * Whether "now" is inside the joinable window for an appointment:
 * [Time - JOIN_WINDOW_BEFORE_MIN, Time + ROOM_BUFFER_AFTER_MIN].
 */
export function isWithinJoinWindow(appointmentTime, now = Date.now()) {
  const t = new Date(appointmentTime).getTime();
  const opensAt = t - DAILY.JOIN_WINDOW_BEFORE_MIN * 60 * 1000;
  const closesAt = t + DAILY.ROOM_BUFFER_AFTER_MIN * 60 * 1000;
  return now >= opensAt && now <= closesAt;
}
