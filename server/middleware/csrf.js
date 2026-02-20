import crypto from 'crypto';

const CSRF_COOKIE = 'iqp_csrf';
const CSRF_HEADER = 'x-csrf-token';

const tokens = new Map();

export function csrfTokenRoute(req, res) {
  const sessionId = req.cookies?.iqp_sid || req.sessionId;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'No session found' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(sessionId, token);
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    path: '/',
    maxAge: 60 * 60 * 1000,
  });
  res.json({ csrfToken: token });
}

export function csrfMiddleware(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path === '/api/auth/login') return next();
  const sessionId = req.cookies?.iqp_sid || req.sessionId;
  const expected = tokens.get(sessionId);
  const provided = req.headers[CSRF_HEADER.toLowerCase()] || req.headers[CSRF_HEADER] || req.body?._csrf;
  if (!sessionId) {
    return res.status(403).json({ success: false, error: 'No session found. Please refresh the page.' });
  }
  if (!expected) {
    return res.status(403).json({ success: false, error: 'CSRF token not found. Please refresh the page.' });
  }
  if (!provided || provided !== expected) {
    return res.status(403).json({ success: false, error: 'Invalid CSRF token. Please refresh the page and try again.' });
  }
  next();
}
