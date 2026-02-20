import jwt from 'jsonwebtoken';
import { getSession } from '../lib/session-store.js';
import { config } from '../config.js';

export function authMiddleware(req, res, next) {
  const session = req.session;
  if (session?.userId) {
    req.user = { userId: session.userId, email: session.email, role: session.role };
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
