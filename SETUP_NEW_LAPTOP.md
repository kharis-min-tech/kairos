# Setting Up KCMS on a New Laptop

Quick guide for setting up the project on a new development machine.

## Prerequisites

- Node.js v18+ installed
- Git installed
- AWS CLI configured (for deployment only)

## Step 1: Clone Repository

```bash
git clone https://github.com/kharis-min-tech/kairos.git
cd kairos/Untitled
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Configure Environment

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

The `.env.local` file should already have the correct values. If not, update with:

```bash
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-north-1_OM97wjySK
NEXT_PUBLIC_COGNITO_CLIENT_ID=7mqmc57sb18ideegj293pk81ib
NEXT_PUBLIC_COGNITO_REGION=eu-north-1
NEXT_PUBLIC_COGNITO_DOMAIN=https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com
NEXT_PUBLIC_COGNITO_AUTHORITY=https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_OM97wjySK
```

## Step 4: Start Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3001

## Step 5: Update Cognito Callback URLs (Important!)

The application now automatically detects your current URL, but you need to ensure Cognito allows callbacks from your machine.

### Option A: Use localhost (Recommended for Development)

If you're running on `localhost:3001`, the existing Cognito configuration should work.

### Option B: Use Your Machine's IP Address

If you need to access from other devices on your network:

1. Find your local IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. Start the dev server on all interfaces:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```

3. Add the callback URL to Cognito:
   - Go to AWS Console → Cognito → User Pools
   - Select your user pool
   - Go to App Integration → App client settings
   - Add callback URL: `http://YOUR-IP:3001/dashboard`
   - Add logout URL: `http://YOUR-IP:3001`

### Option C: Use ngrok for External Access

For testing from completely different networks:

1. Install ngrok: https://ngrok.com/download

2. Start your dev server:
   ```bash
   npm run dev
   ```

3. In another terminal, start ngrok:
   ```bash
   ngrok http 3001
   ```

4. Add the ngrok URL to Cognito callbacks:
   - Callback: `https://YOUR-NGROK-URL.ngrok.io/dashboard`
   - Logout: `https://YOUR-NGROK-URL.ngrok.io`

## How It Works

The application now uses **dynamic URL detection**:

- `redirect_uri` is automatically set to `${window.location.origin}/dashboard`
- `post_logout_redirect_uri` is automatically set to `${window.location.origin}`

This means:
- ✅ Works on `localhost:3001`
- ✅ Works on `192.168.1.x:3001` (local network)
- ✅ Works on `your-ngrok-url.ngrok.io`
- ✅ Works on production CloudFront URL

**No more hardcoded localhost URLs!**

## Troubleshooting

### Error: "redirect_uri_mismatch"

This means Cognito doesn't allow callbacks to your current URL.

**Solution**: Add your URL to Cognito's allowed callback URLs:
1. Go to AWS Console → Cognito → User Pools
2. Select user pool → App Integration → App client
3. Add your URL to "Allowed callback URLs"
4. Add your URL to "Allowed sign-out URLs"

### Error: "Connection Refused"

This means the dev server isn't running.

**Solution**: 
```bash
npm run dev
```

### Error: "Module not found"

Dependencies aren't installed.

**Solution**:
```bash
npm install
```

### Can't Access from Another Device

**Solution**: Start server on all interfaces:
```bash
npm run dev -- -H 0.0.0.0
```

Then access via your machine's IP: `http://192.168.1.x:3001`

## Production Deployment

For production deployment, see:
- [INFRASTRUCTURE_GUIDE.md](INFRASTRUCTURE_GUIDE.md)
- [DEPLOYMENT_WORKFLOW.md](DEPLOYMENT_WORKFLOW.md)

## Quick Reference

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Deploy infrastructure
cd infrastructure && ./deploy.sh dev
```

## Support

- Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for common commands
- See [INFRASTRUCTURE_GUIDE.md](INFRASTRUCTURE_GUIDE.md) for deployment
- Review [README.md](README.md) for project overview
