// Validate required environment variables at module load time
const requireEnv = (name: string, fallback?: string): string => {
  const value = process.env[name] || fallback;
  if (!value) {
    // In development, warn but allow fallback; in production, throw
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    console.warn(`[auth-config] Missing env var ${name} — using empty string`);
    return '';
  }
  return value;
};

// Get the base URL dynamically (works in browser)
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback for SSR
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
};

const COGNITO_AUTHORITY = requireEnv('NEXT_PUBLIC_COGNITO_AUTHORITY');
const COGNITO_CLIENT_ID = requireEnv('NEXT_PUBLIC_COGNITO_CLIENT_ID');
const COGNITO_DOMAIN = requireEnv('NEXT_PUBLIC_COGNITO_DOMAIN');

export const cognitoAuthConfig = {
  authority: COGNITO_AUTHORITY,
  client_id: COGNITO_CLIENT_ID,
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
    issuer: COGNITO_AUTHORITY,
    authorization_endpoint: `${COGNITO_DOMAIN}/oauth2/authorize`,
    token_endpoint: `${COGNITO_DOMAIN}/oauth2/token`,
    userinfo_endpoint: `${COGNITO_DOMAIN}/oauth2/userInfo`,
    end_session_endpoint: `${COGNITO_DOMAIN}/logout`,
    jwks_uri: COGNITO_AUTHORITY ? `${COGNITO_AUTHORITY}/.well-known/jwks.json` : '',
  },
};

export const cognitoDomain = COGNITO_DOMAIN;
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