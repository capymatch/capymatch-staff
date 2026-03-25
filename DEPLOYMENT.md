# CapyMatch — Production Deployment Guide

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Vercel         │     │   Railway         │     │  MongoDB Atlas   │
│   (Frontend)     │────▶│   (Backend)       │────▶│  (Database)      │
│                  │     │                   │     │                  │
│ app.capymatch.com│     │ api.capymatch.com │     │ capymatch-prod   │
└─────────────────┘     └──────────────────┘     └──────────────────┘
```

- **Frontend**: React (CRA) → Vercel → `app.capymatch.com`
- **Backend**: FastAPI → Railway → `api.capymatch.com`
- **Database**: MongoDB Atlas → `capymatch-prod` cluster

---

## 1. Backend — Railway Deployment

### 1a. Environment Variables (Railway Dashboard)

Set these in Railway → Service → Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `APP_ENV` | `production` | Yes |
| `MONGO_URL` | `mongodb+srv://capymatch:<password>@capymatch-prod.63nymfu.mongodb.net` | Yes |
| `DB_NAME` | `capymatch-prod` | Yes |
| `JWT_SECRET` | Generate: `openssl rand -hex 48` | Yes |
| `FRONTEND_URL` | `https://app.capymatch.com` | Yes |
| `ALLOWED_ORIGINS` | `https://app.capymatch.com` | Yes |
| `EMERGENT_LLM_KEY` | `sk-emergent-...` (from Emergent dashboard) | Yes |
| `STRIPE_API_KEY` | `sk_live_...` (Stripe Live key) | Yes |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Stripe webhook setup) | Yes |
| `GMAIL_CLIENT_ID` | From Google Cloud Console | Yes |
| `GMAIL_CLIENT_SECRET` | From Google Cloud Console | Yes |
| `GMAIL_REDIRECT_URI` | `https://api.capymatch.com/api/gmail/callback` | Yes |
| `RESEND_API_KEY` | `re_...` (from Resend dashboard) | Yes |
| `RESEND_FROM_EMAIL` | `noreply@capymatch.com` | Yes |
| `YOUTUBE_API_KEY` | From Google Cloud Console | Optional |
| `COLLEGE_SCORECARD_API_KEY` | From data.ed.gov | Optional |
| `ENABLE_HTTPS_REDIRECT` | `true` | Yes |
| `ENABLE_SECURITY_HEADERS` | `true` | Yes |
| `REDIS_URL` | Railway Redis add-on URL (or leave blank) | Optional |
| `CACHE_ENABLED` | `true` | Recommended |
| `CACHE_TTL_SECONDS` | `60` | Recommended |
| `PORT` | `8001` | Yes |

### 1b. Railway Setup Steps

1. **Create Railway project** at https://railway.app
2. **Connect GitHub repo** → select `capymatch` repository
3. **Set root directory** → `backend`
4. **Add a Dockerfile or Procfile**:

   Create `backend/Procfile`:
   ```
   web: uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}
   ```

5. **Set all environment variables** from table above
6. **Add custom domain**: `api.capymatch.com`
   - Railway will give you a CNAME record to add to your DNS
7. **Deploy** — Railway auto-deploys on git push

### 1c. Post-Deploy Checklist (Backend)
- [ ] Verify health: `curl https://api.capymatch.com/api/health`
- [ ] Verify DB connection: Check Railway logs for "Application startup complete"
- [ ] Set up Stripe webhook → `https://api.capymatch.com/api/stripe/webhook`
- [ ] Update Google OAuth redirect URI → `https://api.capymatch.com/api/gmail/callback`

---

## 2. Frontend — Vercel Deployment

### 2a. Environment Variables (Vercel Dashboard)

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `REACT_APP_BACKEND_URL` | `https://api.capymatch.com` | Yes |

That's it — the frontend only needs the backend URL.

### 2b. Vercel Setup Steps

1. **Create Vercel project** at https://vercel.com
2. **Import GitHub repo** → select `capymatch` repository
3. **Set root directory** → `frontend`
4. **Framework preset** → Create React App
5. **Build command** → `yarn build`
6. **Output directory** → `build`
7. **Set environment variable**: `REACT_APP_BACKEND_URL` = `https://api.capymatch.com`
8. **Add custom domain**: `app.capymatch.com`
   - Vercel will give you DNS records to add
9. **Deploy**

### 2c. Post-Deploy Checklist (Frontend)
- [ ] Verify: `https://app.capymatch.com` loads the login page
- [ ] Verify API calls go to `api.capymatch.com` (check browser Network tab)
- [ ] Test login flow end-to-end

---

## 3. DNS Configuration

Add these records to your `capymatch.com` DNS:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `app` | `cname.vercel-dns.com` | 300 |
| CNAME | `api` | `<railway-provided>.up.railway.app` | 300 |

---

## 4. Environment Comparison

### Development (Emergent Preview)
```
APP_ENV=development
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
FRONTEND_URL=https://match-backend.preview.emergentagent.com
STRIPE_API_KEY=sk_test_...
ENABLE_HTTPS_REDIRECT=false
```

### Staging (Optional — Railway preview env)
```
APP_ENV=staging
MONGO_URL=mongodb+srv://capymatch:<password>@capymatch-prod.63nymfu.mongodb.net
DB_NAME=capymatch-staging
FRONTEND_URL=https://staging.capymatch.com
STRIPE_API_KEY=sk_test_...
ENABLE_HTTPS_REDIRECT=true
```

### Production
```
APP_ENV=production
MONGO_URL=mongodb+srv://capymatch:<password>@capymatch-prod.63nymfu.mongodb.net
DB_NAME=capymatch-prod
FRONTEND_URL=https://app.capymatch.com
STRIPE_API_KEY=sk_live_...
ENABLE_HTTPS_REDIRECT=true
```

---

## 5. Stripe Webhook Setup (Production)

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. URL: `https://api.capymatch.com/api/stripe/webhook`
4. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET` in Railway

---

## 6. Gmail OAuth (Production)

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Edit your OAuth Client
3. Add authorized redirect URI: `https://api.capymatch.com/api/gmail/callback`
4. Add authorized JavaScript origin: `https://app.capymatch.com`
5. Set `GMAIL_REDIRECT_URI=https://api.capymatch.com/api/gmail/callback` in Railway

---

## 7. MongoDB Atlas (Production)

Your cluster: `capymatch-prod.63nymfu.mongodb.net`
Database: `capymatch-prod`

### Network Access
- Add Railway's outbound IPs to Atlas Network Access whitelist
- Or allow `0.0.0.0/0` (less secure, simpler)

### Recommended Indexes
The app creates indexes on startup via `migrations/schema_v2_signals.py`. No manual index setup needed.

---

## 8. Security Checklist

- [ ] Generate a NEW `JWT_SECRET` for production (don't reuse dev)
- [ ] Use Stripe LIVE keys (not test)
- [ ] MongoDB Atlas: restrict network access to Railway IPs
- [ ] CORS: only `https://app.capymatch.com` in `ALLOWED_ORIGINS`
- [ ] Enable HTTPS redirect in production
- [ ] Remove test/demo user accounts from production DB
- [ ] Verify Google OAuth consent screen is published (not in test mode)

---

## Quick Reference

```bash
# Generate JWT secret
openssl rand -hex 48

# Test backend health
curl https://api.capymatch.com/api/health

# Test login
curl -X POST https://api.capymatch.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"..."}'

# Check Railway logs
railway logs
```


---

## 9. Troubleshooting Railway Deployment

### "Application not found" on Railway URL

If `https://capymatch-staff.up.railway.app` returns `{"status":"error","code":404,"message":"Application not found"}`:

1. **Check service is deployed**: Go to Railway Dashboard → Your Project → Service
   - Look for a green "Active" deployment, not "Failed" or "Crashed"
   - If "Failed": click the deployment to see build logs — likely a dependency issue

2. **Check build logs**: Click on the latest deployment → "Build Logs"
   - Common errors: `emergentintegrations` not found (fixed: `--extra-index-url` added to nixpacks.toml)
   - `libmagic` not found (fixed: added `file` to nixPkgs and `libmagic1` to Dockerfile)

3. **Verify the service has a public domain**:
   - Railway Dashboard → Service → Settings → Networking
   - Ensure "Generate Domain" is clicked (creates the `*.up.railway.app` URL)
   - This default domain must be active before custom domains work

4. **Re-deploy**: Push a new commit or click "Deploy" in Railway dashboard

### SSL Certificate Not Provisioning for Custom Domain

If `api.capymatch.com` shows "Validating domain ownership":

1. **Verify DNS**: Run `dig api.capymatch.com CNAME` — should return `capymatch-staff.up.railway.app`
2. **Wait**: SSL provisioning can take 10-30 minutes after DNS propagates
3. **Remove & re-add**: If stuck >1 hour, remove the custom domain in Railway and re-add it
4. **Check Railway status**: https://status.railway.app for platform outages

### Common Railway Environment Issues

- **PORT**: Railway injects a `PORT` env variable. Our Procfile/Dockerfile uses `${PORT:-8001}` to respect it. Do NOT hardcode port in Railway env vars.
- **REDIS_URL**: If not using Railway Redis add-on, leave `REDIS_URL` empty or unset. The app gracefully falls back to DB-only mode.
- **MONGO_URL encoding**: Special characters in password (like `^`, `#`) must be URL-encoded: `%5E` for `^`, `%23` for `#`
