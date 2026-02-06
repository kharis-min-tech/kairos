/**
 * Centralised Cognito configuration.
 * All Cognito-related environment variables must be accessed through this module.
 */

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
  domain: string;    // e.g. https://your-domain.auth.eu-west-2.amazoncognito.com
  authority: string; // e.g. https://cognito-idp.eu-west-2.amazonaws.com/xxxx
}

export type AuthUrlType = "signIn" | "signUp" | "forgotPassword";

const ENV = {
  NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  NEXT_PUBLIC_COGNITO_REGION: process.env.NEXT_PUBLIC_COGNITO_REGION,
  NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
  NEXT_PUBLIC_COGNITO_AUTHORITY: process.env.NEXT_PUBLIC_COGNITO_AUTHORITY,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
} as const;

type EnvKey = keyof typeof ENV;

export function getRequiredEnv(name: EnvKey, description: string): string {
  const value = ENV[name];

  if (!value || value.trim().length === 0) {
    throw new Error(
      `[Cognito Config Error] Missing environment variable: ${name}\n` +
        `Description: ${description}\n` +
        `Fix: Add ${name} to .env.local (see .env.local.example)`
    );
  }

  return value.trim();
}


/**
 * Returns the base URL for redirects:
 * - In browser: uses window.location.origin
 * - In SSR: uses NEXT_PUBLIC_BASE_URL if provided
 * - Fallback: http://localhost:3001
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  const envBase = ENV.NEXT_PUBLIC_BASE_URL;
  if (envBase && envBase.trim().length > 0) return envBase.trim();

  return "http://localhost:3001";
}

export const cognitoConfig: CognitoConfig = {
  userPoolId: getRequiredEnv(
    "NEXT_PUBLIC_COGNITO_USER_POOL_ID",
    "Cognito User Pool ID (e.g. eu-west-2_Abc123XYZ)"
  ),
  clientId: getRequiredEnv(
    "NEXT_PUBLIC_COGNITO_CLIENT_ID",
    "Cognito App Client ID"
  ),
  region: getRequiredEnv(
    "NEXT_PUBLIC_COGNITO_REGION",
    "AWS region for Cognito (e.g. eu-west-2)"
  ),
  domain: getRequiredEnv(
    "NEXT_PUBLIC_COGNITO_DOMAIN",
    "Cognito Hosted UI domain (e.g. https://xxx.auth.eu-west-2.amazoncognito.com)"
  ),
  authority: getRequiredEnv(
    "NEXT_PUBLIC_COGNITO_AUTHORITY",
    "OIDC authority URL (usually Cognito IDP endpoint)"
  ),
};

export function buildAuthUrl(
  type: AuthUrlType,
  extraParams: Record<string, string> = {}
): string {
  const baseUrl = getBaseUrl();
const path =
  type === "signUp" ? "/signup"
  : type === "forgotPassword" ? "/forgotPassword"
  : "/login";

  const url = new URL(`${cognitoConfig.domain}${path}`);
  url.searchParams.set("client_id", cognitoConfig.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("redirect_uri", `${baseUrl}/silent-callback`);

  for (const [k, v] of Object.entries(extraParams)) {
    url.searchParams.set(k, v);
  }

  return url.toString();
}

export function buildLogoutUrl(redirectUri?: string): string {
  const baseUrl = getBaseUrl();
  const logoutUri = redirectUri ?? baseUrl;

  const url = new URL(`${cognitoConfig.domain}/logout`);
  url.searchParams.set("client_id", cognitoConfig.clientId);
  url.searchParams.set("logout_uri", logoutUri);

  return url.toString();
}
