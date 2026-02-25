/**
 * In-memory session store. For production, use Redis (keyed by sessionId).
 * Session contains: userId, email, role, iotDbUrl, userDbUrl, createdAt, lastActivityAt.
 * Credentials are stored server-side only; never sent to client.
 */

import { config } from '../config.js';

const sessions = new Map();

const IDLE_MS = config.sessionIdleTimeoutMinutes * 60 * 1000;
const ABSOLUTE_MS = config.sessionAbsoluteTTLHours * 60 * 60 * 1000;

function isExpired(session) {
  const now = Date.now();
  if (now - session.lastActivityAt > IDLE_MS) return true;
  if (now - session.createdAt > ABSOLUTE_MS) return true;
  return false;
}

export function createSession(sessionId, data) {
  const now = Date.now();
  const session = {
    userId: data.userId,
    email: data.email,
    role: data.role,
    iotDbUrl: data.iotDbUrl,
    userDbUrl: data.userDbUrl,
    createdAt: now,
    lastActivityAt: now,
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || isExpired(session)) {
    if (session) sessions.delete(sessionId);
    return null;
  }
  session.lastActivityAt = Date.now();
  return session;
}

export function destroySession(sessionId) {
  sessions.delete(sessionId);
}

export function getIotDbUrl(sessionId) {
  const s = getSession(sessionId);
  return s ? s.iotDbUrl : null;
}
