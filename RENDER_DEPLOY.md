# Render.com Deployment Guide

## Quick Setup

1. **Connect Repository**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the `iotquery-probe-v2` repository

2. **Configure Service**
   - **Name**: `iotquery-probe-v2` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (or set if repo is in subdirectory)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

3. **Environment Variables** (Required)
   Add these in Render Dashboard → Environment:
   
   | Variable | Value | Notes |
   |----------|-------|-------|
   | `JWT_SECRET` | `[Generate random 32+ char string]` | **Required** - Use Render's "Generate" button or create manually |
   | `NODE_ENV` | `production` | Set automatically by Render, but can be explicit |
   | `PORT` | `10000` | Render sets this automatically, but you can override |

4. **Optional Environment Variables**
   
   | Variable | Default | Description |
   |----------|---------|-------------|
   | `JWT_EXPIRES_IN` | `24h` | JWT token expiration |
   | `SESSION_IDLE_TIMEOUT_MINUTES` | `30` | Session idle timeout |
   | `SESSION_ABSOLUTE_TTL_HOURS` | `8` | Max session age |
   | `QUERY_TIMEOUT_MS` | `300000` | Query timeout (5 minutes) |
   | `QUERY_ROW_LIMIT` | `10000` | Max rows per query |
   | `REPORT_MAX_ROWS` | `500` | Max rows in HTML report |
   | `CSP_FRAME_ANCESTORS` | `https://*.navixy.com https://navixy.com` | CSP frame-ancestors |
   | `CORS_ORIGINS` | `https://*.navixy.com` | Allowed CORS origins |
   | `REDIS_URL` | _(none)_ | Redis URL for session store (optional) |

5. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically
   - Monitor build logs for any issues

## Using render.yaml (Alternative)

If you prefer using a blueprint file:

1. Ensure `render.yaml` is in the repository root
2. In Render Dashboard, select "New" → "Blueprint"
3. Connect your repository
4. Render will read `render.yaml` and create the service

**Note**: You'll still need to manually set `JWT_SECRET` in the Render dashboard after creation.

## Post-Deployment

1. **Get Your App URL**
   - Render provides a URL like: `https://iotquery-probe-v2.onrender.com`
   - Copy this URL

2. **Configure Navixy**
   - Go to Navixy → User applications
   - Add new application
   - Set Application URL to your Render URL
   - Save configuration

3. **Test Health Endpoint**
   ```bash
   curl https://your-app.onrender.com/health
   # Should return: {"ok":true}
   ```

4. **Test Authentication**
   - Open your app URL in Navixy (via iframe)
   - Navixy middleware will call `/api/auth/login`
   - Check Render logs for any errors

## Troubleshooting

### Build Fails
- Check build logs in Render Dashboard
- Verify `package.json` has correct build script
- Ensure Node.js version is >= 18 (check `engines` in package.json)

### App Won't Start
- Check start logs in Render Dashboard
- Verify `JWT_SECRET` is set (at least 32 characters)
- Check that `dist/` folder exists after build
- Verify `PORT` is set (Render sets this automatically)

### Static Files Not Loading
- Verify `NODE_ENV=production` is set
- Check that `dist/` folder is created during build
- Check server logs for static file serving errors

### CORS Errors
- Verify `CORS_ORIGINS` includes your Navixy domain
- Check browser console for specific CORS error
- Ensure `credentials: true` is set (already configured)

### Session Issues
- For production, consider adding Redis:
  1. Create Redis instance in Render
  2. Copy Redis URL
  3. Set `REDIS_URL` environment variable
- Without Redis, sessions are in-memory (lost on restart)

## Production Recommendations

1. **Use Redis for Sessions**
   - Create Redis instance in Render
   - Set `REDIS_URL` environment variable
   - Improves reliability and scalability

2. **Monitor Logs**
   - Use Render's built-in log viewer
   - Set up log aggregation if needed
   - Monitor for errors and performance

3. **Set Up Auto-Deploy**
   - Render auto-deploys on push to main branch
   - Configure branch protection in GitHub
   - Use preview deployments for testing

4. **Health Checks**
   - Render automatically checks `/health` endpoint
   - Ensure it returns `{"ok":true}`
   - Configure custom health check if needed

5. **Scaling**
   - Start with free tier (spins down after inactivity)
   - Upgrade to paid tier for always-on service
   - Consider multiple instances for high availability

## Environment Variable Security

- ✅ Never commit `.env` files
- ✅ Use Render's environment variable UI
- ✅ Use "Generate" for secrets when possible
- ✅ Rotate `JWT_SECRET` periodically
- ✅ Use different secrets for staging/production

## Support

- Render Docs: https://render.com/docs
- Render Status: https://status.render.com
- Check application logs in Render Dashboard
