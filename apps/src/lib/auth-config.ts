export const cognitoAuthConfig = {
  authority: "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_OM97wjySK",
  client_id: "7mqmc57sb18ideegj293pk81ib",
  redirect_uri: "http://localhost:3001/dashboard", // Redirect to dashboard after auth
  response_type: "code",
  scope: "openid email phone", // Using only standard scopes
  // Enhanced configuration for complete auth flow
  automaticSilentRenew: true,
  loadUserInfo: true,
  includeIdTokenInSilentRenew: true,
  monitorSession: true,
  checkSessionInterval: 10000,
  silent_redirect_uri: "http://localhost:3001/silent-callback",
  post_logout_redirect_uri: "http://localhost:3001",
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