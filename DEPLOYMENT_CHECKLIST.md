# Render.com Deployment Checklist ✅

## Pre-Deployment Verification

### ✅ Code Configuration
- [x] **Build command**: `npm install && npm run build` (in render.yaml and README)
- [x] **Start command**: `npm start` (sets NODE_ENV=production)
- [x] **Static files**: Served from `dist/` folder in production mode
- [x] **PORT**: Uses `process.env.PORT` (Render sets automatically)
- [x] **Node version**: Specified in `package.json` (`engines.node >= 18`)

### ✅ Build Output
- [x] **dist/ folder**: Created by `npm run build`
- [x] **index.html**: Present in dist/
- [x] **Assets**: CSS and JS bundles generated correctly

### ✅ Environment Variables
- [x] **JWT_SECRET**: Required (32+ characters) - must be set in Render dashboard
- [x] **NODE_ENV**: Set to `production` by start command
- [x] **PORT**: Auto-set by Render (no manual config needed)
- [x] **Optional vars**: Documented in `.env.example` and README

### ✅ Security
- [x] **No secrets in code**: All secrets use `process.env.*`
- [x] **.env excluded**: In `.gitignore`
- [x] **Static file serving**: Only enabled in production
- [x] **CORS configured**: For Navixy domains
- [x] **CSP headers**: Frame-ancestors for Navixy

### ✅ API Endpoints
- [x] **Health check**: `/health` endpoint available (no auth)
- [x] **Auth endpoint**: `/api/auth/login` (no JWT required)
- [x] **Protected routes**: `/api/query`, `/api/export`, `/api/report` (require JWT)

## Render.com Setup Steps

### 1. Create Web Service
```
Dashboard → New → Web Service
→ Connect GitHub repository
→ Select: iotquery-probe-v2
```

### 2. Configure Build & Start
```
Build Command: npm install && npm run build
Start Command: npm start
```

### 3. Set Environment Variables
**Required:**
- `JWT_SECRET` = [Generate 32+ character random string]

**Optional (with defaults):**
- `NODE_ENV` = `production` (already set by start command)
- `CSP_FRAME_ANCESTORS` = `https://*.navixy.com https://navixy.com`
- `CORS_ORIGINS` = `https://*.navixy.com`
- `REDIS_URL` = [If using Redis for sessions]

### 4. Deploy
- Click "Create Web Service"
- Monitor build logs
- Wait for "Your service is live" message

### 5. Post-Deployment
- [ ] Test health endpoint: `curl https://your-app.onrender.com/health`
- [ ] Configure Navixy User applications with your Render URL
- [ ] Test authentication flow from Navixy
- [ ] Verify static files load correctly
- [ ] Check logs for any errors

## Verification Commands

### Local Build Test
```bash
npm install
npm run build
npm start
# Should serve on http://localhost:3000
# Check: http://localhost:3000/health
```

### Check Build Output
```bash
ls -la dist/
# Should show: index.html, assets/ folder
```

### Verify Environment Variables
```bash
# In Render dashboard, verify:
# - JWT_SECRET is set (32+ chars)
# - NODE_ENV is production (or set by start command)
# - PORT is auto-set by Render
```

## Common Issues & Solutions

### ❌ Build Fails
- **Check**: Node version >= 18
- **Check**: `package.json` scripts are correct
- **Check**: Build logs in Render dashboard

### ❌ App Won't Start
- **Check**: `JWT_SECRET` is set (required)
- **Check**: `dist/` folder exists after build
- **Check**: Start logs in Render dashboard

### ❌ Static Files 404
- **Check**: `NODE_ENV=production` is set
- **Check**: `dist/` folder is created during build
- **Check**: Static file path in `server/index.js` is correct

### ❌ CORS Errors
- **Check**: `CORS_ORIGINS` includes Navixy domain
- **Check**: Browser console for specific error
- **Check**: CORS middleware configuration

### ❌ Authentication Fails
- **Check**: Navixy middleware can reach `/api/auth/login`
- **Check**: Render logs for auth endpoint errors
- **Check**: JWT_SECRET is set correctly

## Production Recommendations

1. **Use Redis** (optional but recommended)
   - Create Redis instance in Render
   - Set `REDIS_URL` environment variable
   - Improves session persistence across restarts

2. **Monitor Logs**
   - Use Render's log viewer
   - Set up alerts for errors
   - Monitor performance metrics

3. **Auto-Deploy**
   - Render auto-deploys on push to main
   - Use branch protection in GitHub
   - Test in staging before production

4. **Scaling**
   - Free tier: Spins down after inactivity
   - Paid tier: Always-on service
   - Multiple instances for HA (if needed)

## Files Included in Deployment

✅ **Included:**
- `package.json` - Dependencies and scripts
- `server/` - Backend code
- `src/` - Frontend source (built to `dist/`)
- `dist/` - Built frontend (created during build)
- `render.yaml` - Blueprint (optional)
- `.env.example` - Environment variable template

❌ **Excluded (via .gitignore):**
- `node_modules/` - Installed during build
- `.env` - Secrets (set in Render dashboard)
- `dist/` - Rebuilt during deployment
- Development files

## Status: ✅ READY FOR DEPLOYMENT

All configuration is correct. The application is ready to deploy to Render.com.
