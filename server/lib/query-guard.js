/**
 * Read-only policy and guardrails for SQL execution.
 * Deny: DROP, DELETE, UPDATE, INSERT, ALTER, COPY, CREATE EXTENSION, etc.
 */

const DENY_PATTERN = /\b(DROP|DELETE|UPDATE|INSERT|ALTER\s|COPY\s+(TO|FROM)|CREATE\s+EXTENSION|TRUNCATE|GRANT|REVOKE|EXECUTE\s+ON)\b/gi;

export function isReadOnly(sql) {
  const normalized = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  return !DENY_PATTERN.test(normalized);
}

import { config } from '../config.js';

export function getStatementTimeoutMs() {
  return config.queryTimeoutMs;
}
