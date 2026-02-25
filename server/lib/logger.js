export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      event: 'request',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
    }));
  });
  next();
}

export function auditLog(action, meta = {}) {
  console.log(JSON.stringify({
    event: 'audit',
    action,
    ...meta,
    ts: new Date().toISOString(),
  }));
}
