# Deployment Guide - Internal Asset Management System

## Quick Deploy Option (Recommended)

### Frontend Deployment on Vercel (Free)

1. **Push to GitHub** (Already done ✅)
   - Your code is already at: https://github.com/vbrajcic/internal-tool.git

2. **Deploy Frontend to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub account
   - Click "Add New Project"
   - Import your repository: `vbrajcic/internal-tool`
   - Set these settings:
     - **Framework Preset**: Vite
     - **Root Directory**: `frontend/frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - Click "Deploy"

3. **Configure Environment Variables on Vercel**
   - In your Vercel project dashboard, go to Settings → Environment Variables
   - Add these variables:
     ```
     VITE_API_URL = https://your-backend-url.com/api
     VITE_AUTH0_DOMAIN = your-domain.auth0.com
     VITE_AUTH0_CLIENT_ID = your-auth0-client-id
     ```

### Backend Deployment on Railway (Free Tier)

1. **Deploy Backend to Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub account
   - Click "Deploy from GitHub repo"
   - Select your repository: `vbrajcic/internal-tool`
   - Set these settings:
     - **Root Directory**: `backend/backend`
     - **Build Command**: `npm run build`
     - **Start Command**: `npm run start:prod`

2. **Add PostgreSQL Database**
   - In Railway dashboard, click "Add Service" → "Database" → "PostgreSQL"
   - Railway will automatically create database and provide connection URL

3. **Configure Environment Variables on Railway**
   - In your Railway service, go to Variables tab
   - Add these variables:
     ```
     NODE_ENV = production
     PORT = 3001
     DATABASE_URL = ${{Postgres.DATABASE_URL}}
     FRONTEND_URL = https://your-vercel-app.vercel.app
     JWT_SECRET = your-super-secret-jwt-key-here
     AUTH0_DOMAIN = your-domain.auth0.com
     AUTH0_AUDIENCE = your-auth0-api-identifier
     ```

4. **Update Frontend API URL**
   - Copy your Railway backend URL (e.g., `https://your-app.railway.app`)
   - Update the `VITE_API_URL` in Vercel to point to your Railway backend
   - Redeploy Vercel frontend

## Alternative: Demo Mode (No Auth Required)

For quick demo purposes, you can deploy without Auth0:

1. **Create Demo Environment File**
   ```bash
   # In frontend/frontend/.env.production
   VITE_API_URL=http://localhost:3001/api
   VITE_DEMO_MODE=true
   ```

2. **Use Mock Authentication**
   - The app already has mock auth in `AuthContext`
   - Comment out Auth0 dependency in production

## Testing Your Deployment

1. **Frontend URL**: Your Vercel app will be available at:
   `https://your-project-name.vercel.app`

2. **Backend URL**: Your Railway app will be available at:
   `https://your-project-name.railway.app`

3. **Test Features**:
   - ✅ Dark/Light mode toggle
   - ✅ Navigation between pages
   - ✅ Equipment management
   - ✅ Dashboard functionality
   - ✅ Responsive design

## Custom Domain (Optional)

### For Professional Deployment:

1. **Buy a domain** (e.g., from Namecheap, GoDaddy)
2. **Configure Vercel Custom Domain**:
   - In Vercel project settings → Domains
   - Add your domain (e.g., `asset-management.yourcompany.com`)
3. **Configure Railway Custom Domain**:
   - In Railway service settings → Domains
   - Add API subdomain (e.g., `api.asset-management.yourcompany.com`)

## Environment-Specific URLs

After deployment, you'll have:

- **Production Frontend**: `https://internal-tool.vercel.app`
- **Production Backend**: `https://internal-tool.railway.app`
- **Database**: Automatically managed by Railway

## Cost Estimate

- **Vercel**: Free for personal/hobby projects
- **Railway**: $5/month for hosted services (includes PostgreSQL)
- **Custom Domain**: $10-15/year (optional)

**Total Monthly Cost**: ~$5 (or free with subdomains)

## Next Steps

1. Deploy frontend to Vercel (5 minutes)
2. Deploy backend to Railway (5 minutes)
3. Configure environment variables (2 minutes)
4. Test deployment (2 minutes)
5. Share URL with coworkers! 🎉

---

Need help? The deployment should take about 15 minutes total!