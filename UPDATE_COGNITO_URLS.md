# Update Cognito Callback URLs

Since the app now uses dynamic URL detection, you need to update Cognito to allow callbacks from all URLs where you'll access the app.

## Current Issue

Your Cognito User Pool only allows callbacks to `http://localhost:3001/dashboard`. When you try to log in from another laptop or device, it fails because Cognito rejects the callback.

## Solution: Add Multiple Callback URLs

### Option 1: AWS Console (Manual)

1. Go to AWS Console: https://console.aws.amazon.com/cognito
2. Select **User Pools**
3. Click on your user pool: `eu-north-1_OM97wjySK`
4. Go to **App Integration** tab
5. Scroll down to **App clients and analytics**
6. Click on your app client: `7mqmc57sb18ideegj293pk81ib`
7. Click **Edit** under **Hosted UI**
8. Update **Allowed callback URLs** to include:
   ```
   http://localhost:3001/dashboard
   http://localhost:3001
   http://127.0.0.1:3001/dashboard
   http://127.0.0.1:3001
   ```
9. Update **Allowed sign-out URLs** to include:
   ```
   http://localhost:3001
   http://127.0.0.1:3001
   ```
10. Click **Save changes**

### Option 2: AWS CLI (Automated)

```bash
# Get current app client configuration
aws cognito-idp describe-user-pool-client \
  --user-pool-id eu-north-1_OM97wjySK \
  --client-id 7mqmc57sb18ideegj293pk81ib \
  --region eu-north-1

# Update callback URLs
aws cognito-idp update-user-pool-client \
  --user-pool-id eu-north-1_OM97wjySK \
  --client-id 7mqmc57sb18ideegj293pk81ib \
  --region eu-north-1 \
  --callback-urls \
    "http://localhost:3001/dashboard" \
    "http://localhost:3001" \
    "http://127.0.0.1:3001/dashboard" \
    "http://127.0.0.1:3001" \
  --logout-urls \
    "http://localhost:3001" \
    "http://127.0.0.1:3001" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "openid" "email" "phone" "profile" \
  --allowed-o-auth-flows-user-pool-client
```

### Option 3: Using CDK (Recommended)

When you deploy with CDK, it will automatically configure the correct callback URLs based on your environment configuration in `infrastructure/bin/kcms-infrastructure.ts`.

For development:
```typescript
dev: {
  domainPrefix: 'kcms-dev',
  callbackUrls: [
    'http://localhost:3001',
    'http://localhost:3001/dashboard',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3001/dashboard'
  ],
  logoutUrls: [
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ],
},
```

Then deploy:
```bash
cd infrastructure
./deploy.sh dev
```

## For Production

When deploying to production, add your production URLs:

```typescript
prod: {
  domainPrefix: 'kcms-prod',
  callbackUrls: [
    'https://yourdomain.com',
    'https://yourdomain.com/dashboard',
    'https://www.yourdomain.com',
    'https://www.yourdomain.com/dashboard'
  ],
  logoutUrls: [
    'https://yourdomain.com',
    'https://www.yourdomain.com'
  ],
},
```

## For Local Network Access

If you want to access from other devices on your local network:

1. Find your machine's IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. Add your IP to Cognito callbacks:
   ```
   http://192.168.1.x:3001/dashboard
   http://192.168.1.x:3001
   ```

3. Start dev server on all interfaces:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```

4. Access from other devices: `http://192.168.1.x:3001`

## For ngrok (External Testing)

1. Install ngrok: https://ngrok.com/download

2. Start ngrok:
   ```bash
   ngrok http 3001
   ```

3. Add ngrok URL to Cognito:
   ```
   https://your-random-id.ngrok.io/dashboard
   https://your-random-id.ngrok.io
   ```

## Verification

After updating, test by:

1. Clear browser cache and cookies
2. Go to your app URL
3. Click "Sign In"
4. You should be redirected to Cognito
5. After login, you should be redirected back to `/dashboard`

If you get `redirect_uri_mismatch` error, the URL you're using isn't in the allowed list.

## Quick Fix Script

Create a file `update-cognito-urls.sh`:

```bash
#!/bin/bash

USER_POOL_ID="eu-north-1_OM97wjySK"
CLIENT_ID="7mqmc57sb18ideegj293pk81ib"
REGION="eu-north-1"

aws cognito-idp update-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --region $REGION \
  --callback-urls \
    "http://localhost:3001/dashboard" \
    "http://localhost:3001" \
    "http://127.0.0.1:3001/dashboard" \
    "http://127.0.0.1:3001" \
  --logout-urls \
    "http://localhost:3001" \
    "http://127.0.0.1:3001" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "openid" "email" "phone" "profile" \
  --allowed-o-auth-flows-user-pool-client

echo "✅ Cognito callback URLs updated!"
```

Make it executable and run:
```bash
chmod +x update-cognito-urls.sh
./update-cognito-urls.sh
```

## Next Steps

Once Cognito is updated, the app will work from:
- ✅ Any laptop running `localhost:3001`
- ✅ Any device on your local network (if you add the IP)
- ✅ Any ngrok URL (if you add it)
- ✅ Production domain (when deployed)

No more "connection refused" errors! 🎉
