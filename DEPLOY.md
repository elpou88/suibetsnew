# SuiBets Deployment Guide

Deploy SuiBets to Railway (backend + frontend) with PostgreSQL database.

## Prerequisites

1. GitHub account with repository: https://github.com/elpou88/suibets.git
2. Railway account (https://railway.app)
3. API-Sports subscription key

## Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial deployment commit"
git remote add origin https://github.com/elpou88/suibets.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Railway

### Option A: Railway Dashboard (Recommended)

1. Go to https://railway.app and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `elpou88/suibets` repository
4. Railway will auto-detect the configuration from `railway.toml`

### Option B: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init

# Link to existing project (if already created in dashboard)
railway link

# Deploy
railway up
```

## Step 3: Add PostgreSQL Database

1. In Railway dashboard, click on your project
2. Click "New" → "Database" → "Add PostgreSQL"
3. Railway auto-sets `DATABASE_URL` environment variable

## Step 4: Configure Environment Variables

In Railway dashboard, go to your service → Variables, and add:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Auto-set by Railway PostgreSQL | Yes |
| `API_SPORTS_KEY` | `3ec255b133882788e32f6349eff77b21` | Yes |
| `SESSION_SECRET` | Generate a random 32+ character string | Yes |
| `NODE_ENV` | `production` | Yes |
| `PORT` | `5000` | Yes |
| `SUI_NETWORK` | `mainnet` or `testnet` | Yes |
| `SBETS_TOKEN_ADDRESS` | `0x6a4d9c0eab7ac40371a7453d1aa6c89b130950e8af6868ba975fdd81371a7285::sbets::SBETS` | Yes |
| `STRIPE_SECRET_KEY` | Your Stripe key | Optional |
| `VITE_STRIPE_PUBLIC_KEY` | Your Stripe public key | Optional |

## Step 5: Database Migration

After deployment, Railway runs the build command which includes database setup. To manually run migrations:

```bash
# Using Railway CLI
railway run npm run db:push
```

## Step 6: Verify Deployment

1. Railway provides a public URL like `suibets-production.up.railway.app`
2. Visit the URL to verify the app is running
3. Check `/api/health` endpoint for backend status

## Custom Domain (Optional)

1. In Railway, go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## Monitoring & Logs

- Railway provides real-time logs in the dashboard
- Use "Observability" tab for metrics
- Set up alerts for deployment failures

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility (18+)

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL addon is running

### API Not Working
- Verify `API_SPORTS_KEY` is set
- Check logs for API rate limit errors

## Architecture Overview

```
Railway Project
├── PostgreSQL Database (Railway addon)
└── SuiBets Service
    ├── Express.js Backend (port 5000)
    └── React Frontend (served by Express)
```

The app runs as a single service with the Express backend serving both API routes and the static React frontend.
