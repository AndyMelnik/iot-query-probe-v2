import crypto from 'crypto';
import { createSession, getSession } from '../lib/session-store.js';

const COOKIE_NAME = 'iqp_sid';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/',
};

export function sessionMiddleware(req, res, next) {
  let sid = req.cookies?.[COOKIE_NAME];
  if (!sid || !getSession(sid)) {
    sid = crypto.randomBytes(32).toString('hex');
    res.cookie(COOKIE_NAME, sid, COOKIE_OPTS);
    req.sessionId = sid;
    req.session = null;
  } else {
    req.sessionId = sid;
    req.session = getSession(sid);
  }
  next();
}

export function createSessionAndSetCookie(req, res, data) {
  const sid = crypto.randomBytes(32).toString('hex');
  createSession(sid, data);
  res.cookie(COOKIE_NAME, sid, { ...COOKIE_OPTS, maxAge: COOKIE_OPTS.maxAge });
  return sid;
}
