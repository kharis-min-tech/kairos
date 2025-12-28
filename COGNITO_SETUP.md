# Amazon Cognito OIDC Authentication Setup

This project now includes Amazon Cognito authentication using `oidc-client-ts` and `react-oidc-context`.

## Configuration

The authentication configuration is located in `apps/src/lib/auth-config.ts`:

```typescript
export const cognitoAuthConfig = {
  authority: "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_OM97wjySK",
  client_id: "7mqmc57sb18ideegj293pk81ib",
  redirect_uri: "https://d84l1y8p4kdic.cloudfront.net",
  response_type: "code",
  scope: "phone openid email",
  automaticSilentRenew: true,
  loadUserInfo: true,
};
```

## Important: Update Configuration

Before using in production, make sure to update:

1. **Cognito Domain**: Replace `cognitoDomain` in `auth-config.ts` with your actual Cognito domain
2. **Logout URI**: Update `logoutUri` to match your application's logout endpoint
3. **Redirect URI**: Ensure the `redirect_uri` matches your application's URL

## Components and Hooks

### CognitoAuthProvider
Wraps your application with the OIDC authentication context.

### useCognitoAuth Hook
Custom hook that provides:
- All standard `useAuth` functionality from `react-oidc-context`
- `signOutRedirect()` - Redirects to Cognito logout
- `getUserInfo()` - Returns formatted user information
- `isReady` - Boolean indicating auth is loaded and ready

### AuthGuard Component
Protects routes by requiring authentication:

```tsx
import { AuthGuard } from "../components/auth-guard";

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <div>This content requires authentication</div>
    </AuthGuard>
  );
}
```

## Usage Examples

### Basic Authentication Check
```tsx
import { useCognitoAuth } from "../hooks/use-cognito-auth";

function MyComponent() {
  const { isAuthenticated, signinRedirect, getUserInfo } = useCognitoAuth();
  
  if (!isAuthenticated) {
    return <button onClick={() => signinRedirect()}>Sign In</button>;
  }
  
  const user = getUserInfo();
  return <div>Welcome, {user?.email}!</div>;
}
```

### Sign Out
```tsx
const { signOutRedirect, removeUser } = useCognitoAuth();

// Local sign out (removes tokens from browser)
<button onClick={() => removeUser()}>Sign Out Locally</button>

// Full Cognito sign out (redirects to Cognito logout)
<button onClick={() => signOutRedirect()}>Sign Out</button>
```

## Pages

- **Home Page** (`/`): Shows authentication status and sign-in options
- **Login Page** (`/login`): Full authentication interface with token display for debugging

## Dependencies Added

- `oidc-client-ts`: OIDC client library
- `react-oidc-context`: React context provider for OIDC

## Next Steps

1. Update the configuration values to match your Cognito setup
2. Test the authentication flow
3. Add protected routes using the `AuthGuard` component
4. Implement user profile management
5. Add error handling for authentication failures