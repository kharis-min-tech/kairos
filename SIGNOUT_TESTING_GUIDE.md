# Sign Out Testing Guide

## Enhanced Sign Out Implementation

The sign out functionality has been improved to provide three different sign out methods:

### 1. Local Sign Out (`signOutLocal`)
- Clears only the local browser session
- Removes user data from local storage
- Redirects to home page
- User remains signed in at Cognito level

### 2. Complete Sign Out (`signOutComplete`)
- Clears local browser session
- Clears all local storage and session storage
- Signs out from Cognito server
- Redirects through Cognito logout endpoint
- Completely terminates all sessions

### 3. Legacy Sign Out (`signOutRedirect`)
- Alias for complete sign out
- Maintained for backward compatibility

## Testing the Sign Out Functionality

### Test 1: Local Sign Out
1. Sign in to your application
2. Go to Profile page
3. Click "Sign Out (Local Only)"
4. Verify:
   - You're redirected to home page
   - You appear signed out in the app
   - If you go back to Cognito hosted UI, you might still be signed in there

### Test 2: Complete Sign Out
1. Sign in to your application
2. Go to Profile page
3. Click "Sign Out (Complete)"
4. Verify:
   - You're redirected through Cognito logout
   - You end up back at home page
   - You're completely signed out everywhere
   - Going to Cognito hosted UI shows you as signed out

### Test 3: Header Sign Out
1. Sign in and go to dashboard
2. Click "Sign out" in the header
3. Verify complete sign out behavior

### Test 4: Cross-Tab Sign Out
1. Open your app in two browser tabs
2. Sign in on both tabs
3. Sign out (complete) from one tab
4. Check the other tab - it should also be signed out

## Implementation Details

### Enhanced Hook Features

The `useCognitoAuth` hook now provides:

```typescript
const {
  signOutLocal,      // Local sign out only
  signOutComplete,   // Complete sign out (recommended)
  signOutRedirect,   // Alias for complete sign out
  removeUser,        // Alias for local sign out
} = useCognitoAuth();
```

### Storage Cleanup

The complete sign out now clears:
- OIDC user data from localStorage
- All sessionStorage data
- Specific Cognito tokens
- Browser cache (through redirect)

### Error Handling

All sign out methods include:
- Try-catch error handling
- Fallback mechanisms
- Console error logging
- Forced redirects if cleanup fails

## Troubleshooting Sign Out Issues

### Issue 1: Still Signed In After Sign Out
**Symptoms**: User appears signed out but can access protected pages
**Solution**: 
- Use `signOutComplete()` instead of local sign out
- Clear browser cache manually
- Check for multiple browser tabs

### Issue 2: Redirect Loop After Sign Out
**Symptoms**: Page keeps redirecting after sign out
**Solution**:
- Check callback URLs in Cognito configuration
- Verify logout URLs are properly configured
- Clear browser cache and cookies

### Issue 3: Sign Out Button Not Working
**Symptoms**: Nothing happens when clicking sign out
**Solution**:
- Check browser console for errors
- Verify the hook is properly imported
- Check network tab for failed requests

### Issue 4: Partial Sign Out
**Symptoms**: Signed out locally but still signed in at Cognito
**Solution**:
- Always use `signOutComplete()` for full sign out
- Check Cognito logout URL configuration
- Verify client_id and logout_uri parameters

## Configuration Verification

Ensure your Cognito User Pool has:

1. **Logout URLs configured**:
   - `http://localhost:3001` (for development)
   - Your production domain

2. **App Client Settings**:
   - OAuth flows enabled
   - Proper callback and logout URLs
   - Correct scopes (openid, email, phone)

3. **Domain Configuration**:
   - Cognito domain is active
   - Custom domain (if used) is properly configured

## Manual Testing Checklist

- [ ] Local sign out works and redirects to home
- [ ] Complete sign out clears all sessions
- [ ] Header sign out button works
- [ ] Profile page sign out options work
- [ ] Cross-tab sign out synchronization
- [ ] No console errors during sign out
- [ ] Proper redirects after sign out
- [ ] Cannot access protected pages after sign out
- [ ] Can sign in again after sign out

## Production Considerations

For production deployment:

1. **Update logout URLs** in Cognito configuration
2. **Use HTTPS** for all callback and logout URLs
3. **Test sign out** across different browsers
4. **Monitor sign out errors** in CloudWatch
5. **Consider session timeout** settings
6. **Test mobile browser** sign out behavior

## Advanced Sign Out Features

### Silent Sign Out
For advanced use cases, you can implement silent sign out:

```typescript
const silentSignOut = async () => {
  await auth.removeUser();
  // Don't redirect, just clear session
};
```

### Forced Sign Out
For security scenarios:

```typescript
const forceSignOut = () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.replace('/');
};
```

### Sign Out with Confirmation
For better UX:

```typescript
const confirmSignOut = () => {
  if (confirm('Are you sure you want to sign out?')) {
    signOutComplete();
  }
};
```

## Monitoring Sign Out

To monitor sign out behavior:

1. **Browser DevTools**: Check Network and Console tabs
2. **AWS CloudWatch**: Monitor Cognito logs
3. **Application Logs**: Log sign out events
4. **User Feedback**: Monitor support requests about sign out issues

The enhanced sign out implementation should now provide reliable, complete sign out functionality across all scenarios.