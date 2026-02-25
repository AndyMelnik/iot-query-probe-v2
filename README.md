# IoT Query Probe v2

Lightweight, browser-based tool for exploring and exporting IoT telematics data. Designed to be embedded in **Navixy** via iframe and authenticated via **Navixy App Connect**.

---

## ⚠️ Before first deploy (Render.com)

**You must set `JWT_SECRET`** or the app will not start.

1. Render Dashboard → your service → **Environment** tab  
2. **Add Environment Variable**: Key `JWT_SECRET`, Value = a random string **at least 32 characters**  
3. Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`  
4. Save → Render will redeploy. See [RENDER_SETUP.md](RENDER_SETUP.md) if you see `secretOrPrivateKey must have a value`.

---

## Features

- **Auth**: Navixy App Connect (middleware POSTs to `/api/auth/login` with `email`, `iotDbUrl`, `userDbUrl`, `role`; app returns JWT; credentials never sent to browser).
- **SQL editor**: Run read-only PostgreSQL queries with 10-minute timeout and configurable row limit (default 10,000). Use `{{variable_name}}` in SQL and set values in the Variables accordion without editing the query.
- **Results**: Sortable, filterable table with pagination (20 rows per page).
- **Charts**: Line, bar, pie, stacked bar/area with grouping, custom title, legend position, and per-series colors.
- **Map**: Scatter map; latitude/longitude columns are auto-detected from column names or from the first valid numeric coordinate pair in the data.
- **Export**: Excel (.xlsx), print-friendly HTML report (A4 landscape), and report JSON (save/load SQL, variables, and report metadata).

## Quick start

```bash
cp .env.example .env
# Edit .env: set JWT_SECRET (min 32 chars)
npm install
npm run build
npm start
```

For local UI dev with API proxy:

```bash
npm run dev          # server + Vite dev server
# or
npm run dev:server   # API only (port 3000)
npm run dev:client   # Vite only (port 5173)
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for signing JWTs (min 32 characters). |
| `JWT_EXPIRES_IN` | No | e.g. `24h` (default). |
| `SESSION_IDLE_TIMEOUT_MINUTES` | No | Idle session timeout (default 30). |
| `SESSION_ABSOLUTE_TTL_HOURS` | No | Max session age (default 8). |
| `QUERY_TIMEOUT_MS` | No | Per-query timeout (default 600000 = 10 min). |
| `QUERY_ROW_LIMIT` | No | Max rows returned (default 10000). |
| `REPORT_MAX_ROWS` | No | Max rows in HTML report (default 500). |
| `CSP_FRAME_ANCESTORS` | No | `frame-ancestors` for iframe (default Navixy). |
| `CORS_ORIGINS` | No | Allowed origins, comma-separated. |
| `DB_REJECT_UNAUTHORIZED` | No | Set to `true` to reject self-signed certificates (default: `false`, accepts self-signed). |
| `NODE_TLS_REJECT_UNAUTHORIZED` | No | Set to `1` to reject all self-signed certificates globally (default: accepts self-signed). |
| `PORT` | No | Server port (default 3000). |

**No secrets in repo.** Use Render (or your host) environment variables.

## SQL variables and report JSON

- In the SQL editor, use placeholders like `{{limit}}` or `{{start_date}}`. The **Variables** accordion lists parsed names; set values there and run the query. Values are substituted before execution.
- **Export report JSON** saves the current SQL, variable values, and report name/description to a `.json` file. **Import report JSON** loads a previously saved report and restores SQL, variables, and metadata.

## Navixy App Connect integration

1. Implemented: **POST /api/auth/login** accepts `email`, `iotDbUrl`, `userDbUrl`, `role` and returns `{ success, user, token }`.
2. JWT is used as `Authorization: Bearer <token>` on all `/api/*` requests.
3. DB URLs are stored server-side only; queries run via the backend with per-session/tenant isolation.

Configure the app in Navixy **User applications**: set the app URL to your deployed base URL. Users open the app from Navixy; the middleware performs the auth handshake and stores the JWT in `localStorage` as `auth_token`.

## Deploy on Render.com

1. New **Web Service**, connect your GitHub repo.
2. **Build command**: `npm install && npm run build`
3. **Start command**: `npm start`
4. Add env vars (at least `JWT_SECRET`).
5. Optional: add **Redis** and set `REDIS_URL` for production session store (otherwise in-memory store is used).

## Security

- **Read-only**: Only `SELECT`-style queries allowed; write/DDL denied.
- **Session**: HttpOnly, Secure, SameSite=None cookies; server-side session store.
- **CSP**: `frame-ancestors` restricted to Navixy (configurable).
- **CSRF**: Token required for state-changing requests (export/report).
- **Credentials**: Postgres URLs never sent to the client.
- **SSL/TLS**: By default, accepts self-signed certificates for database connections (common with Navixy databases). Connections are still encrypted; only certificate authority verification is skipped. Configure via `DB_REJECT_UNAUTHORIZED` or `NODE_TLS_REJECT_UNAUTHORIZED` environment variables.

## License

Use per your organization’s policy.
