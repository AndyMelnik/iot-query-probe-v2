export const config = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  sessionIdleTimeoutMinutes: parseInt(process.env.SESSION_IDLE_TIMEOUT_MINUTES || '30', 10),
  sessionAbsoluteTTLHours: parseInt(process.env.SESSION_ABSOLUTE_TTL_HOURS || '8', 10),
  queryTimeoutMs: parseInt(process.env.QUERY_TIMEOUT_MS || String(5 * 60 * 1000), 10),
  queryRowLimit: parseInt(process.env.QUERY_ROW_LIMIT || '10000', 10),
  reportMaxRows: parseInt(process.env.REPORT_MAX_ROWS || '500', 10),
  redisUrl: process.env.REDIS_URL,
};

if (!config.jwtSecret || config.jwtSecret.length < 32) {
  console.warn('JWT_SECRET should be at least 32 characters. Set JWT_SECRET in environment.');
}
