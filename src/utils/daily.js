// src/utils/daily.js
// Thin server-side wrapper around the Daily.co REST API (Phase 28).
// The DAILY_API_KEY is used only here, on the server. It is NEVER sent to the browser.
// Node 18+ provides a global `fetch`.

import { AppError } from './AppError.js';
import { DAILY } from '../constants.js';

const API_BASE = DAILY.API_BASE;

function authHeaders() {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new AppError('Daily.co is not configured (missing DAILY_API_KEY).', 500);
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Low-level request helper. Surfaces Daily outages as a clean 502 AppError
 * so callers (booking, confirm, join) fail gracefully instead of crashing.
 */
async function dailyRequest(method, path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    throw new AppError('Unable to reach the video service. Please try again.', 502);
  }

  // DELETE on a missing room returns 404 — callers treat that as "already gone".
  if (res.status === 404) return { notFound: true };

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!res.ok) {
    const detail = data?.info || data?.error || `HTTP ${res.status}`;
    throw new AppError(`Video service error: ${detail}`, 502);
  }
  return data;
}

/**
 * Creates a private, ephemeral room.
 * @param {string} roomName  opaque name (no PHI), e.g. consult-<uuid>
 * @param {number} expUnix   unix seconds when the room auto-deletes
 */
export async function createRoom(roomName, expUnix) {
  return dailyRequest('POST', '/rooms', {
    name: roomName,
    privacy: 'private',
    properties: {
      exp: expUnix,
      eject_at_room_exp: true,
      enable_chat: true,
      enable_screenshare: true,
      enable_knocking: true
    }
  });
}

/**
 * Mints a per-user meeting token scoped to one room.
 * Nurse => is_owner:true (can admit knockers, end call). Student => guest.
 */
export async function createMeetingToken({ roomName, userName, isOwner, expUnix }) {
  const data = await dailyRequest('POST', '/meeting-tokens', {
    properties: {
      room_name: roomName,
      user_name: userName,
      is_owner: !!isOwner,
      exp: expUnix,
      close_tab_on_exit: true
    }
  });
  return data.token;
}

/** Fetches a room (used to check existence / expiry). Returns { notFound:true } if gone. */
export async function getRoom(roomName) {
  return dailyRequest('GET', `/rooms/${encodeURIComponent(roomName)}`);
}

/** Deletes a room. Safe to call if it's already gone. */
export async function deleteRoom(roomName) {
  if (!roomName) return { notFound: true };
  return dailyRequest('DELETE', `/rooms/${encodeURIComponent(roomName)}`);
}
