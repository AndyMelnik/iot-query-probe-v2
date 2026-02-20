import pg from 'pg';
import { getSession } from '../lib/session-store.js';
import { getCredentials } from '../lib/credential-store.js';
import { config } from '../config.js';

const { Pool } = pg;

const poolsByKey = new Map();
const MAX_POOL_SIZE = 3;

function getPoolKey(url) {
  try {
    const u = new URL(url.replace(/^postgresql:\/\//, 'https://'));
    return `${u.hostname}:${u.pathname}`;
  } catch {
    return url;
  }
}

function createPool(connectionString) {
  const key = getPoolKey(connectionString);
  if (!poolsByKey.has(key)) {
    // Determine SSL configuration
    // Navixy databases often use self-signed certificates - we accept them by default
    // SSL is still used for encryption, but certificate authority is not verified
    
    // Check if connection string explicitly sets sslmode=disable
    const sslDisabled = connectionString.includes('sslmode=disable');
    
    // Default: accept self-signed certificates (rejectUnauthorized: false)
    // Can be overridden via DB_REJECT_UNAUTHORIZED=true env var
    const rejectUnauthorized = config.dbRejectUnauthorized === true;

    const poolConfig = {
      connectionString,
      max: MAX_POOL_SIZE,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000,
    };

    // Set SSL configuration
    // pg library: ssl: false disables SSL, ssl: { rejectUnauthorized: false } enables SSL but accepts self-signed
    if (sslDisabled) {
      poolConfig.ssl = false;
    } else {
      // Use SSL but accept self-signed certificates
      // This is safe: connection is still encrypted, just CA verification is skipped
      poolConfig.ssl = {
        rejectUnauthorized: rejectUnauthorized, // false = accept self-signed (default)
      };
    }

    poolsByKey.set(key, new Pool(poolConfig));
  }
  return poolsByKey.get(key);
}

export function getIotPool(req) {
  const session = req.session;
  if (session?.iotDbUrl) return createPool(session.iotDbUrl);
  const creds = getCredentials(req.user?.userId);
  if (creds?.iotDbUrl) return createPool(creds.iotDbUrl);
  return null;
}
