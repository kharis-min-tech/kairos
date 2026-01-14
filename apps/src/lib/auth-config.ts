// Get the base URL dynamically (works in browser)
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback for SSR
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
};

export const cognitoAuthConfig = {
  authority: process.env.NEXT_PUBLIC_COGNITO_AUTHORITY || "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_OM97wjySK",
  client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "7mqmc57sb18ideegj293pk81ib",
  redirect_uri: `${getBaseUrl()}/dashboard`,
  response_type: "code",
  scope: "openid email phone",
  // Enhanced logout configuration
  post_logout_redirect_uri: getBaseUrl(),
  automaticSilentRenew: false, // Disable to avoid silent callback issues
  loadUserInfo: true,
  // Additional settings for better logout handling
  revokeAccessTokenOnSignout: true,
  includeIdTokenInSilentRenew: false,
  // Callback handling - stay on the redirect_uri after successful auth
  onSigninCallback: () => {
    // Remove query parameters but stay on current page
    window.history.replaceState({}, document.title, window.location.pathname);
  },
  // Metadata for better OIDC compliance
  metadata: {
    issuer: process.env.NEXT_PUBLIC_COGNITO_AUTHORITY || "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_OM97wjySK",
    authorization_endpoint: process.env.NEXT_PUBLIC_COGNITO_DOMAIN 
      ? `${process.env.NEXT_PUBLIC_COGNITO_DOMAIN}/oauth2/authorize`
      : "https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com/oauth2/authorize",
    token_endpoint: process.env.NEXT_PUBLIC_COGNITO_DOMAIN
      ? `${process.env.NEXT_PUBLIC_COGNITO_DOMAIN}/oauth2/token`
      : "https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com/oauth2/token",
    userinfo_endpoint: process.env.NEXT_PUBLIC_COGNITO_DOMAIN
      ? `${process.env.NEXT_PUBLIC_COGNITO_DOMAIN}/oauth2/userInfo`
      : "https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com/oauth2/userInfo",
    end_session_endpoint: process.env.NEXT_PUBLIC_COGNITO_DOMAIN
      ? `${process.env.NEXT_PUBLIC_COGNITO_DOMAIN}/logout`
      : "https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com/logout",
    jwks_uri: process.env.NEXT_PUBLIC_COGNITO_AUTHORITY
      ? `${process.env.NEXT_PUBLIC_COGNITO_AUTHORITY}/.well-known/jwks.json`
      : "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_OM97wjySK/.well-known/jwks.json",
  },
};

export const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com";
export const logoutUri = getBaseUrl();

// Auth flow URLs
export const authUrls = {
  signIn: `${cognitoDomain}/login`,
  signUp: `${cognitoDomain}/signup`,
  forgotPassword: `${cognitoDomain}/forgotPassword`,
  mfa: `${cognitoDomain}/mfa`,
  confirmSignUp: `${cognitoDomain}/confirmSignUp`,
  resetPassword: `${cognitoDomain}/resetPassword`,
  logout: `${cognitoDomain}/logout`,
};

// Helper function to build auth URLs with parameters
export const buildAuthUrl = (
  type: keyof typeof authUrls,
  additionalParams: Record<string, string> = {}
) => {
  const baseUrl = authUrls[type];
  const params = new URLSearchParams({
    client_id: cognitoAuthConfig.client_id,
    response_type: cognitoAuthConfig.response_type,
    scope: cognitoAuthConfig.scope, // This will now use "openid email phone"
    redirect_uri: `${getBaseUrl()}/dashboard`,
    ...additionalParams,
  });
  
  return `${baseUrl}?${params.toString()}`;
};

// Helper function to build logout URL
export const buildLogoutUrl = (redirectUri?: string) => {
  const params = new URLSearchParams({
    client_id: cognitoAuthConfig.client_id,
    logout_uri: redirectUri || getBaseUrl(),
  });
  
  return `${authUrls.logout}?${params.toString()}`;
};