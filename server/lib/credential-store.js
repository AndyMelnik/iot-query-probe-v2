/**
 * Stores iotDbUrl (and userDbUrl) per userId for JWT-based requests.
 * TTL 60 minutes; credentials never sent to client.
 */

const store = new Map();
const TTL_MS = 60 * 60 * 1000;

function prune(entry) {
  if (Date.now() - entry.at > TTL_MS) {
    store.delete(entry.userId);
    return null;
  }
  return entry;
}

export function setCredentials(userId, { iotDbUrl, userDbUrl }) {
  store.set(userId, { userId, iotDbUrl, userDbUrl, at: Date.now() });
}

export function getCredentials(userId) {
  const entry = store.get(userId);
  if (!entry) return null;
  return prune(entry) ? { iotDbUrl: entry.iotDbUrl, userDbUrl: entry.userDbUrl } : null;
}
