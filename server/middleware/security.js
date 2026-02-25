import helmet from 'helmet';

const navixyFrameAncestors = (process.env.CSP_FRAME_ANCESTORS || 'https://*.navixy.com https://navixy.com').split(',').map(s => s.trim()).join(' ');

export function securityHeaders(app) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        frameAncestors: navixyFrameAncestors.split(' ').filter(Boolean),
        formAction: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    crossOriginEmbedderPolicy: false,
  }));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
}
