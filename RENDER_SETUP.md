# Render.com Setup - Fix JWT_SECRET Error

## Error You're Seeing

```
Error: secretOrPrivateKey must have a value
```

This means `JWT_SECRET` environment variable is **not set** in Render.

## Quick Fix

1. **Go to Render Dashboard**
   - Navigate to your service: https://dashboard.render.com
   - Click on your `iotquery-probe-v2` service

2. **Add Environment Variable**
   - Click on **"Environment"** tab (left sidebar)
   - Click **"Add Environment Variable"**
   - **Key**: `JWT_SECRET`
   - **Value**: Generate a secure random string (see below)
   - Click **"Save Changes"**

3. **Generate Secure Secret**
   
   Option A - Using Node.js (local):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   
   Option B - Using OpenSSL:
   ```bash
   openssl rand -hex 32
   ```
   
   Option C - Using online generator:
   - Visit: https://www.random.org/strings/
   - Length: 64 characters
   - Character set: Hexadecimal (0-9, a-f)

4. **Redeploy**
   - After saving, Render will automatically redeploy
   - Or click **"Manual Deploy"** → **"Deploy latest commit"**

## Verify It's Set

After deployment, check logs:
- Should see: `{"event":"server_start","port":...}`
- Should NOT see: `❌ ERROR: JWT_SECRET environment variable is not set!`

## Required Environment Variables

| Variable | Required | Example |
|----------|----------|---------|
| `JWT_SECRET` | ✅ **YES** | `a1b2c3d4e5f6...` (64 hex chars) |
| `NODE_ENV` | No | `production` (auto-set by start command) |
| `PORT` | No | Auto-set by Render |

## Optional Environment Variables

You can also set these for customization:

- `JWT_EXPIRES_IN` (default: `24h`)
- `SESSION_IDLE_TIMEOUT_MINUTES` (default: `30`)
- `QUERY_TIMEOUT_MS` (default: `300000`)
- `CSP_FRAME_ANCESTORS` (default: Navixy domains)
- `CORS_ORIGINS` (default: Navixy domains)
- `REDIS_URL` (optional, for Redis session store)

## After Fixing

Once `JWT_SECRET` is set:
1. ✅ Service will start successfully
2. ✅ `/health` endpoint will return `{"ok":true}`
3. ✅ `/api/auth/login` will work when called by Navixy middleware

## Still Having Issues?

1. **Check Render Logs**
   - Dashboard → Your Service → Logs tab
   - Look for startup errors

2. **Verify Variable Name**
   - Must be exactly: `JWT_SECRET` (case-sensitive)
   - No spaces before/after

3. **Check Variable Value**
   - Must be at least 32 characters
   - No quotes needed (Render handles this)

4. **Redeploy**
   - Sometimes changes need a manual redeploy
   - Click "Manual Deploy" → "Deploy latest commit"
