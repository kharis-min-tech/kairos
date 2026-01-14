export const cognitoAuthConfig = {
  authority: "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_OM97wjySK",
  client_id: "7mqmc57sb18ideegj293pk81ib",
  redirect_uri: "http://localhost:3001/dashboard",
  response_type: "code",
  scope: "openid email phone",
  // Enhanced logout configuration
  post_logout_redirect_uri: "http://localhost:3001",
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
    issuer: "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_OM97wjySK",
    authorization_endpoint: "https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com/oauth2/authorize",
    token_endpoint: "https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com/oauth2/token",
    userinfo_endpoint: "https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com/oauth2/userInfo",
    end_session_endpoint: "https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com/logout",
    jwks_uri: "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_OM97wjySK/.well-known/jwks.json",
  },
};

export const cognitoDomain = "https://eu-north-1om97wjysk.auth.eu-north-1.amazoncognito.com";
export const logoutUri = "http://localhost:3001";

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
    redirect_uri: cognitoAuthConfig.redirect_uri,
    ...additionalParams,
  });
  
  return `${baseUrl}?${params.toString()}`;
};

// Helper function to build logout URL
export const buildLogoutUrl = (redirectUri?: string) => {
  const params = new URLSearchParams({
    client_id: cognitoAuthConfig.client_id,
    logout_uri: redirectUri || cognitoAuthConfig.post_logout_redirect_uri,
  });
  
  return `${authUrls.logout}?${params.toString()}`;
};