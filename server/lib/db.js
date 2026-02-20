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
    // Navixy databases often use self-signed certificates, so we need to accept them
    // but still use SSL for encryption
    const sslConfig = (() => {
      // Check if connection string explicitly sets sslmode
      if (connectionString.includes('sslmode=')) {
        const sslmode = connectionString.match(/sslmode=([^&]+)/)?.[1];
        if (sslmode === 'disable') return false;
        // For require, prefer, allow, verify-ca, verify-full - use SSL
        // Accept self-signed certs unless explicitly configured otherwise
        return { rejectUnauthorized: config.dbRejectUnauthorized };
      }
      // Default: use SSL, accept self-signed certs (can be overridden via env var)
      return { rejectUnauthorized: config.dbRejectUnauthorized };
    })();

    poolsByKey.set(key, new Pool({
      connectionString,
      max: MAX_POOL_SIZE,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000,
      ssl: sslConfig,
    }));
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
