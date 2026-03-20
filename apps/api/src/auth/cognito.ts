// @kairos/api - Cognito JWT verification helper
// Uses aws-jwt-verify to validate tokens issued by Amazon Cognito

import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { CognitoJwtVerifierSingleUserPool } from 'aws-jwt-verify/cognito-verifier';

/** Decoded Cognito JWT payload with custom claims */
export interface CognitoTokenPayload {
  /** Cognito user ID (subject) */
  sub: string;
  /** User email address */
  email?: string;
  /** Custom role attribute from Cognito */
  'custom:role'?: string;
  /** Custom branch ID attribute from Cognito */
  'custom:branchId'?: string;
  /** Token use (access or id) */
  token_use: string;
}

/** Singleton verifier instance — reused across warm Lambda invocations */
let verifierInstance: CognitoJwtVerifierSingleUserPool<{
  userPoolId: string;
  tokenUse: 'id';
  clientId: string;
}> | null = null;

/**
 * Returns the singleton CognitoJwtVerifier instance.
 * Creates a new instance on first call (Lambda cold start).
 * Reuses the existing instance on subsequent calls (warm invocations).
 *
 * Environment variables required:
 * - COGNITO_USER_POOL_ID: Cognito User Pool ID
 * - COGNITO_CLIENT_ID: Cognito App Client ID
 */
function getVerifier() {
  if (!verifierInstance) {
    const userPoolId = process.env['COGNITO_USER_POOL_ID'];
    const clientId = process.env['COGNITO_CLIENT_ID'];

    if (!userPoolId) {
      throw new Error(
        'COGNITO_USER_POOL_ID environment variable is required'
      );
    }
    if (!clientId) {
      throw new Error(
        'COGNITO_CLIENT_ID environment variable is required'
      );
    }

    verifierInstance = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'id',
      clientId,
    });
  }

  return verifierInstance;
}

/**
 * Verifies a Cognito JWT access token and returns the decoded payload.
 *
 * @param token - The raw JWT string (without "Bearer " prefix)
 * @returns Decoded token payload with Cognito claims
 * @throws Error if the token is invalid, expired, or cannot be verified
 */
export async function verifyCognitoToken(
  token: string
): Promise<CognitoTokenPayload> {
  const verifier = getVerifier();
  const payload = await verifier.verify(token);

  return {
    sub: payload.sub,
    email: payload['email'] as string | undefined,
    'custom:role': payload['custom:role'] as string | undefined,
    'custom:branchId': payload['custom:branchId'] as string | undefined,
    token_use: payload.token_use,
  };
}

/**
 * Resets the singleton verifier instance.
 * Useful for testing when environment variables change.
 */
export function resetVerifier(): void {
  verifierInstance = null;
}
