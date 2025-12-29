# MFA Testing Guide

## 🔐 Multi-Factor Authentication Status: **WORKING**

The MFA functionality is properly implemented and working. Here's how to test it:

## How MFA Works in KCMS

### **MFA Detection**
- ✅ App automatically detects MFA status from Cognito user claims
- ✅ Shows in profile page and dashboard
- ✅ Provides security recommendations when disabled

### **MFA Setup Process**
1. **Access MFA Setup**:
   - Go to Profile → "Set Up MFA" button
   - Or Dashboard → Security recommendations
   - Or Sidebar → Security link

2. **Setup Flow**:
   - Click "Set Up MFA" button
   - Redirects to Cognito hosted UI
   - Choose MFA method (SMS or Authenticator app)
   - Follow Cognito's setup instructions
   - Verify with test code
   - Return to KCMS app

3. **Status Update**:
   - MFA status automatically updates in app
   - Security recommendations disappear
   - Profile shows "MFA Enabled"

## 🧪 Step-by-Step MFA Testing

### **Test 1: Check MFA Status**
1. Sign in to your account
2. Go to Profile page
3. Look for "Two-Factor Auth" status
4. Should show "Disabled" with warning icon if not set up

### **Test 2: Access MFA Setup**
1. From Profile page, click "Set Up MFA (Recommended)" button
2. OR from Dashboard, click "Set Up Two-Factor Auth" link
3. OR from Sidebar, click "Security" → "Set Up MFA"
4. Should redirect to MFA setup page

### **Test 3: MFA Setup Page**
1. Navigate to `/auth/mfa-setup`
2. Should show professional UI with:
   - Shield icon and title
   - Benefits of MFA
   - Setup process steps
   - "Set Up MFA" button

### **Test 4: Cognito MFA Setup**
1. Click "Set Up MFA" button
2. Should redirect to Cognito hosted UI
3. Sign in again (for security verification)
4. Choose MFA method:
   - **SMS**: Enter phone number
   - **TOTP**: Use authenticator app (Google Authenticator, Authy, etc.)

### **Test 5: Complete Setup**
1. Follow Cognito's instructions
2. Verify with test code
3. Should redirect back to KCMS
4. Check profile - MFA status should now show "Enabled"

### **Test 6: MFA Login**
1. Sign out completely
2. Sign in again
3. Should now prompt for MFA code
4. Enter code from SMS or authenticator app
5. Should successfully sign in

## 🔧 MFA Configuration Options

### **SMS MFA**
- **Pros**: Easy for users, no app required
- **Cons**: Requires phone number, carrier dependent
- **Setup**: Enter phone number in Cognito

### **TOTP MFA (Recommended)**
- **Pros**: More secure, works offline
- **Cons**: Requires authenticator app
- **Apps**: Google Authenticator, Authy, Microsoft Authenticator
- **Setup**: Scan QR code with authenticator app

## 🚨 Troubleshooting MFA Issues

### **Issue 1: MFA Button Not Working**
**Symptoms**: Clicking "Set Up MFA" does nothing
**Solutions**:
- Check browser console for errors
- Verify user is authenticated
- Try refreshing the page

### **Issue 2: Cognito Redirect Fails**
**Symptoms**: Error when redirecting to Cognito
**Solutions**:
- Check Cognito configuration
- Verify callback URLs are correct
- Check network connectivity

### **Issue 3: MFA Status Not Updating**
**Symptoms**: MFA shows as disabled after setup
**Solutions**:
- Sign out and sign in again
- Clear browser cache
- Check Cognito user attributes

### **Issue 4: SMS Not Received**
**Symptoms**: SMS verification code not arriving
**Solutions**:
- Check phone number format
- Verify SMS is enabled in Cognito
- Check carrier spam filters
- Try TOTP instead

### **Issue 5: Authenticator App Issues**
**Symptoms**: TOTP codes not working
**Solutions**:
- Check device time synchronization
- Re-scan QR code
- Try different authenticator app
- Verify 6-digit code format

## 📱 Recommended Authenticator Apps

### **Google Authenticator**
- Free, widely used
- iOS and Android
- Simple interface

### **Authy**
- Free, feature-rich
- Cloud backup
- Multi-device support

### **Microsoft Authenticator**
- Free, enterprise-grade
- Push notifications
- Biometric unlock

## 🔒 MFA Security Best Practices

### **For Users**
- ✅ Enable MFA on all accounts
- ✅ Use TOTP over SMS when possible
- ✅ Keep backup codes secure
- ✅ Don't share MFA codes

### **For Administrators**
- ✅ Require MFA for all users
- ✅ Provide clear setup instructions
- ✅ Monitor MFA adoption rates
- ✅ Have recovery procedures

## 📊 MFA Implementation Details

### **Technical Implementation**
```typescript
// MFA status detection
const userInfo = getUserInfo();
const mfaEnabled = userInfo?.mfaEnabled; // From Cognito claims

// MFA setup redirect
const mfaSetupRedirect = () => {
  window.location.href = `${cognitoDomain}/login?...&prompt=login`;
};
```

### **Cognito Configuration Required**
- MFA must be enabled in Cognito User Pool
- SMS configuration (if using SMS MFA)
- TOTP configuration (if using authenticator apps)
- Proper OAuth scopes and flows

## ✅ MFA Testing Checklist

- [ ] MFA status displays correctly in profile
- [ ] Security recommendations show when MFA disabled
- [ ] MFA setup button redirects to Cognito
- [ ] Can complete MFA setup in Cognito
- [ ] MFA status updates after setup
- [ ] Login requires MFA code after setup
- [ ] Can successfully authenticate with MFA
- [ ] MFA works on mobile devices

## 🎯 Expected Results

After successful MFA setup:
- ✅ Profile shows "Two-Factor Auth: Enabled"
- ✅ Security recommendations disappear
- ✅ Login requires MFA code
- ✅ Dashboard shows MFA enabled status
- ✅ Enhanced security for user account

## 📞 Need Help?

If MFA isn't working:
1. Check the browser console for errors
2. Verify Cognito User Pool MFA settings
3. Test with different browsers
4. Try both SMS and TOTP methods
5. Check AWS CloudWatch logs for Cognito errors

The MFA implementation follows AWS Cognito best practices and provides enterprise-grade security for your church management system.