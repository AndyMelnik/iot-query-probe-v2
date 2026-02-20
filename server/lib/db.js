import pg from 'pg';
import { getSession } from '../lib/session-store.js';
import { getCredentials } from '../lib/credential-store.js';

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
    poolsByKey.set(key, new Pool({
      connectionString,
      max: MAX_POOL_SIZE,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
