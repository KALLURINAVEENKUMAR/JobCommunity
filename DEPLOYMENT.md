# Backend Deployment Guide

## Option 1: Deploy to Railway (Recommended)

### Step 1: Set up MongoDB Atlas (Free)
1. Go to https://www.mongodb.com/atlas
2. Sign up for free account
3. Create a new cluster (choose free tier)
4. Create a database user
5. Get your connection string

### Step 2: Deploy to Railway
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository: `KALLURINAVEENKUMAR/JobCommunity`
5. Add these environment variables:
   - `NODE_ENV`: production
   - `PORT`: 5000
   - `MONGODB_URI`: your_mongodb_atlas_connection_string

### Step 3: Update Frontend Environment
1. After Railway deployment, you'll get a URL like: `https://job-community-backend-production.up.railway.app`
2. Update the `.env.production` file with your Railway URL
3. Commit and push to trigger GitHub Pages redeployment

## Option 2: Deploy to Render (Alternative)

### Step 1: Set up MongoDB Atlas (same as above)

### Step 2: Deploy to Render
1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your repository
5. Use these settings:
   - Build Command: `cd backend && npm ci`
   - Start Command: `cd backend && npm start`
   - Environment Variables:
     - `NODE_ENV`: production
     - `MONGODB_URI`: your_mongodb_atlas_connection_string

### Step 3: Update Frontend (same as Railway)

## Testing the Deployment
1. Visit your Railway/Render backend URL + `/api/health`
2. Should return a JSON response with status: "healthy"
3. Test your frontend at: https://kallurinaveenkumar.github.io/JobCommunity/
4. Register users and test real-time chat across different devices/browsers

## Troubleshooting
- If CORS errors occur, check that your backend allows your GitHub Pages domain
- If MongoDB connection fails, verify your connection string and IP whitelist
- If Socket.IO doesn't work, ensure both HTTP and WebSocket traffic is allowed
