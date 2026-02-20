import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { createSessionAndSetCookie } from '../middleware/session.js';
import { setCredentials } from '../lib/credential-store.js';
import { auditLog } from '../lib/logger.js';

export const authRouter = async (req, res) => {
  const { email, iotDbUrl, userDbUrl, role } = req.body || {};
  if (!email || !iotDbUrl || !userDbUrl) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: email, iotDbUrl, userDbUrl',
    });
  }

  const userId = uuidv4();
  const userRole = role || 'admin';

  createSessionAndSetCookie(req, res, {
    userId,
    email: email.trim(),
    role: userRole,
    iotDbUrl,
    userDbUrl,
  });
  setCredentials(userId, { iotDbUrl, userDbUrl });

  const token = jwt.sign(
    { userId, email: email.trim(), role: userRole },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  auditLog('login', { userId, email: email.trim() });

  return res.json({
    success: true,
    user: {
      id: userId,
      email: email.trim(),
      role: userRole,
    },
    token,
  });
};
