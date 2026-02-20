# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |

## Security Best Practices

### Environment Variables
- **Never commit `.env` files** - they are excluded via `.gitignore`
- All secrets must be set via environment variables (see `.env.example`)
- `JWT_SECRET` must be at least 32 characters and kept secure
- Database connection strings (`iotDbUrl`, `userDbUrl`) are provided by Navixy middleware and stored server-side only

### Dependencies
- Regular `npm audit` checks recommended
- Known vulnerabilities are tracked and addressed
- Production dependencies are kept up-to-date

## Known Vulnerabilities

### Development Dependencies
- **esbuild (via Vite)**: Moderate severity vulnerability affecting dev server only (GHSA-67mh-4wv8-2f99)
  - **Impact**: Development environment only, not production
  - **Mitigation**: Dev server should not be exposed to untrusted networks
  - **Status**: Will be resolved when Vite updates esbuild dependency

### Production Dependencies
- **xlsx → exceljs**: Replaced `xlsx` package (Prototype Pollution, ReDoS) with `exceljs` (actively maintained, secure)

## Reporting a Vulnerability

If you discover a security vulnerability, please:
1. **Do not** open a public issue
2. Email security details to the repository maintainer
3. Include steps to reproduce and potential impact
4. Allow time for assessment and patching before disclosure

## Security Features

- ✅ Read-only SQL queries (SELECT only)
- ✅ Query timeout (5 minutes default)
- ✅ Row limit enforcement (10,000 default)
- ✅ Server-side session isolation
- ✅ HttpOnly, Secure cookies
- ✅ CSRF protection for state-changing requests
- ✅ Content Security Policy (CSP) with configurable frame-ancestors
- ✅ Rate limiting (120 requests/minute)
- ✅ Credentials never sent to client
- ✅ SQL injection protection via parameterized queries (PostgreSQL)
