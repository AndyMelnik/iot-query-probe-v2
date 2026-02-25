import crypto from 'crypto';

const CSRF_COOKIE = 'iqp_csrf';
const CSRF_HEADER = 'x-csrf-token';

/**
 * Double-Submit Cookie CSRF Protection
 * 
 * Simpler approach: Server sets a random cookie, client reads it and sends in header.
 * Server compares cookie value with header value. No server-side storage needed.
 * 
 * Security: Attacker can't read SameSite=None cookie from different origin,
 * and even if they could, they'd need to send it in header which requires
 * making a request from our domain (protected by CORS + JWT auth).
 */
export function csrfTokenRoute(req, res) {
  // Generate or reuse existing CSRF cookie
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
  }
  
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // Must be readable by JS for double-submit pattern
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none', // Required for iframe
    path: '/',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours (matches session)
  });
  
  res.json({ csrfToken: token });
}

export function csrfMiddleware(req, res, next) {
  // Skip CSRF for safe methods and auth endpoints
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path === '/api/auth/login') return next();
  if (req.path === '/api/csrf-token') return next();
  
  // Double-submit cookie pattern: compare cookie value with header value
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER.toLowerCase()] || req.headers[CSRF_HEADER] || req.body?._csrf;
  
  if (!cookieToken) {
    // No CSRF cookie - generate one and allow request (first request scenario)
    const newToken = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE, newToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return next();
  }
  
  if (!headerToken) {
    return res.status(403).json({ 
      success: false, 
      error: 'CSRF token missing in request header',
      code: 'CSRF_TOKEN_MISSING'
    });
  }
  
  if (cookieToken !== headerToken) {
    return res.status(403).json({ 
      success: false, 
      error: 'CSRF token mismatch',
      code: 'CSRF_TOKEN_MISMATCH'
    });
  }
  
  // Tokens match - request is valid
  next();
}
