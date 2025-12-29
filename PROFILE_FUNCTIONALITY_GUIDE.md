# Profile Functionality Guide

## ✅ Profile Features Implementation

The profile functionality has been enhanced to provide users with comprehensive account management capabilities.

### **Profile Access Points**

Users can access their profile through multiple ways:

1. **Header User Menu** (Top right corner)
   - Click on user avatar/name
   - Dropdown menu with profile link
   - Quick access to security settings

2. **Sidebar Navigation** (Left sidebar)
   - "Profile" link in ACCOUNT section
   - Always visible when authenticated

3. **Dashboard Quick Actions**
   - Profile card in Quick Actions section
   - Direct link from dashboard

4. **Direct URL Access**
   - `/profile` - Main profile page (within auth layout)
   - `/auth/profile` - Standalone profile page

### **Profile Page Features**

#### **Account Information Display**
- ✅ Email address and verification status
- ✅ Name (if provided)
- ✅ Phone number and verification status (if provided)
- ✅ Two-Factor Authentication status
- ✅ User ID for reference
- ✅ Visual status indicators (icons and colors)

#### **Security Recommendations**
- ✅ Dynamic alerts for unverified email
- ✅ Recommendations for enabling 2FA
- ✅ Color-coded status indicators
- ✅ Action buttons for immediate fixes

#### **Account Actions**
- ✅ Change Password link
- ✅ Set Up Two-Factor Authentication
- ✅ Debug information toggle
- ✅ Navigation back to dashboard

#### **Sign Out Options**
- ✅ Local sign out (browser only)
- ✅ Complete sign out (all sessions)
- ✅ Clear explanations of each option

#### **Debug Information**
- ✅ Toggle-able debug section
- ✅ ID, Access, and Refresh tokens display
- ✅ Scrollable token containers
- ✅ Developer-friendly formatting

### **User Experience Enhancements**

#### **Visual Design**
- ✅ Clean, professional layout
- ✅ Consistent KCMS branding
- ✅ FontAwesome icons throughout
- ✅ Responsive grid layout
- ✅ Color-coded status indicators

#### **Navigation**
- ✅ Breadcrumb-style navigation
- ✅ Multiple access points
- ✅ Consistent sidebar highlighting
- ✅ User menu dropdown

#### **Accessibility**
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ High contrast status indicators
- ✅ Clear action buttons

## **Testing Checklist**

### **Profile Access Testing**
- [ ] Click user menu in header → Profile opens
- [ ] Click Profile in sidebar → Profile opens
- [ ] Click Profile from dashboard → Profile opens
- [ ] Direct URL `/profile` works
- [ ] Profile shows correct user information

### **Information Display Testing**
- [ ] Email address displays correctly
- [ ] Email verification status shows properly
- [ ] Name displays (if set in Cognito)
- [ ] Phone displays (if set in Cognito)
- [ ] 2FA status shows correctly
- [ ] User ID displays

### **Security Features Testing**
- [ ] Security recommendations appear when needed
- [ ] 2FA setup link works
- [ ] Change password link works
- [ ] Status indicators are color-coded correctly

### **Sign Out Testing**
- [ ] Local sign out clears session
- [ ] Complete sign out redirects through Cognito
- [ ] User is properly signed out
- [ ] Can sign back in after sign out

### **Debug Features Testing**
- [ ] Debug toggle shows/hides tokens
- [ ] Tokens display in scrollable containers
- [ ] All three token types show (ID, Access, Refresh)

### **Responsive Design Testing**
- [ ] Profile works on mobile devices
- [ ] Grid layout adapts to screen size
- [ ] User menu works on mobile
- [ ] All buttons are touch-friendly

## **Profile Data Sources**

The profile gets user information from:

```typescript
const userInfo = getUserInfo();
// Returns:
{
  email: string,
  name?: string,
  sub: string, // User ID
  phone?: string,
  emailVerified: boolean,
  phoneVerified?: boolean,
  mfaEnabled: boolean,
  profile: object, // Full OIDC profile
  idToken: string,
  accessToken: string,
  refreshToken: string
}
```

## **Common Issues & Solutions**

### **Issue 1: Profile Not Loading**
**Symptoms**: Profile shows "Unable to load user information"
**Solutions**:
- Check if user is properly authenticated
- Verify OIDC tokens are valid
- Check browser console for errors

### **Issue 2: Missing User Information**
**Symptoms**: Some fields show as empty
**Solutions**:
- Check Cognito user attributes
- Verify OIDC scopes include required claims
- Update user profile in Cognito console

### **Issue 3: Navigation Not Working**
**Symptoms**: Profile links don't work
**Solutions**:
- Check route configuration
- Verify AuthGuard is working
- Check for JavaScript errors

### **Issue 4: Status Indicators Wrong**
**Symptoms**: Verification status shows incorrectly
**Solutions**:
- Check Cognito user verification status
- Verify OIDC claims mapping
- Update user verification in Cognito

## **Profile Customization**

### **Adding New Fields**
To add new profile fields:

1. Update `getUserInfo()` in the auth hook
2. Add field display in profile component
3. Update Cognito user attributes if needed

### **Styling Changes**
Profile uses Tailwind CSS classes:
- `neutral-*` colors for consistent branding
- `border-neutral-200` for borders
- `bg-neutral-50` for backgrounds
- FontAwesome icons with `fa-solid` prefix

### **Security Considerations**

- ✅ Profile is protected by AuthGuard
- ✅ Tokens are only shown in debug mode
- ✅ Sensitive information is properly formatted
- ✅ Sign out clears all sessions
- ✅ User menu closes on outside click

## **Mobile Optimization**

The profile is fully responsive:
- Grid layouts adapt to screen size
- User menu works on touch devices
- Buttons are properly sized for mobile
- Text remains readable on small screens

## **Future Enhancements**

Potential profile improvements:
- Profile picture upload
- Editable user information
- Activity log/history
- Notification preferences
- Account deletion option
- Export user data

The profile functionality is now comprehensive and user-friendly, providing all essential account management features with a clean, professional interface.