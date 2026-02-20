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

// Validate JWT_SECRET at startup
if (!config.jwtSecret) {
  console.error('❌ ERROR: JWT_SECRET environment variable is not set!');
  console.error('   Set JWT_SECRET in Render Dashboard → Environment → Add Environment Variable');
  console.error('   Value must be at least 32 characters long.');
  process.exit(1);
}

if (config.jwtSecret.length < 32) {
  console.error('❌ ERROR: JWT_SECRET must be at least 32 characters long!');
  console.error(`   Current length: ${config.jwtSecret.length} characters`);
  console.error('   Generate a secure random string: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}
