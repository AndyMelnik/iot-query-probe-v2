import { Router } from 'express';
import { getIotPool } from '../lib/db.js';
import { isReadOnly, getStatementTimeoutMs } from '../lib/query-guard.js';
import { config } from '../config.js';
import { auditLog } from '../lib/logger.js';

export const queryRouter = Router();

queryRouter.post('/execute', async (req, res) => {
  const pool = getIotPool(req);
  if (!pool) {
    return res.status(401).json({ success: false, error: 'No database credentials' });
  }

  const { sql } = req.body || {};
  if (typeof sql !== 'string' || !sql.trim()) {
    return res.status(400).json({ success: false, error: 'Missing or invalid sql' });
  }

  if (!isReadOnly(sql)) {
    return res.status(403).json({ success: false, error: 'Only SELECT queries are allowed' });
  }

  const timeoutMs = getStatementTimeoutMs();
  const rowLimit = config.queryRowLimit;
  const trimmed = sql.trim().replace(/;\s*$/, '');
  const hasLimit = /\blimit\s+\d+/i.test(trimmed);
  const appliedSql = hasLimit ? trimmed : `${trimmed} LIMIT ${rowLimit + 1}`;

  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query(`SET statement_timeout = ${timeoutMs}`);
      const result = await client.query(appliedSql);
      const duration = Date.now() - start;
      const rows = result.rows.slice(0, rowLimit);
      const truncated = result.rows.length > rowLimit;

      auditLog('query_execute', {
        userId: req.user?.userId,
        rowCount: rows.length,
        durationMs: duration,
        truncated: !!truncated,
      });

      return res.json({
        success: true,
        columns: result.fields.map(f => ({ name: f.name, dataType: f.dataTypeID })),
        rows,
        rowCount: rows.length,
        truncated,
        executionTimeMs: duration,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    const duration = Date.now() - start;
    const code = err.code || 'QUERY_ERROR';
    let message = err.message || 'Query failed';
    
    // Handle SSL/certificate errors
    if (message.includes('self-signed certificate') || message.includes('certificate') || code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      auditLog('db_ssl_error', { 
        userId: req.user?.userId, 
        error: message,
        code,
      });
      message = 'Database SSL certificate error. Please contact administrator.';
    }
    
    if (code === '57014') {
      return res.status(408).json({ success: false, error: 'Query timeout', executionTimeMs: duration });
    }
    
    return res.status(400).json({
      success: false,
      error: message,
      code,
      executionTimeMs: duration,
    });
  }
});
