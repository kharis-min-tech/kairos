// @kairos/api - Custom Authorizer Lambda for API Gateway HTTP API
// Validates JWT from Cognito and returns claims as context.
// NOT in VPC — needs internet to fetch Cognito JWKS keys.
// Member/role lookup is deferred to route Lambdas (which have VPC access).

import type {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerWithContextResult,
} from 'aws-lambda';
import { verifyCognitoToken } from './cognito';
import { createLogger } from '@kairos/utils';

const logger = createLogger('authorizer');

/** Context values injected into downstream Lambda events */
export interface AuthorizerContext {
  sub: string;
  email: string;
  role: string;
  branch_id: string;
}

export const handler = async (
  event: APIGatewayRequestAuthorizerEventV2
): Promise<APIGatewaySimpleAuthorizerWithContextResult<AuthorizerContext>> => {
  logger.info('Authorizer invoked', {
    routeArn: event.routeArn,
    requestId: event.requestContext?.requestId,
  });

  try {
    // 1. Extract Bearer token
    const token = extractBearerToken(event);
    if (!token) {
      logger.warn('Missing or invalid Authorization header');
      return denyResponse();
    }

    // 2. Verify JWT with Cognito
    const payload = await verifyCognitoToken(token);
    logger.info('JWT verified', { sub: payload.sub, email: payload.email });

    const email = payload.email;
    if (!email) {
      logger.warn('JWT missing email claim', { sub: payload.sub });
      return denyResponse();
    }

    // 3. Return JWT claims as context — route Lambdas do DB lookup
    return {
      isAuthorized: true,
      context: {
        sub: payload.sub,
        email,
        role: payload['custom:role'] ?? '',
        branch_id: payload['custom:branchId'] ?? '',
      },
    };
  } catch (error) {
    logger.error('Authorization failed', error);
    return denyResponse();
  }
};

function extractBearerToken(
  event: APIGatewayRequestAuthorizerEventV2
): string | null {
  const authHeader =
    event.headers?.['authorization'] ?? event.headers?.['Authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

function denyResponse(): APIGatewaySimpleAuthorizerWithContextResult<AuthorizerContext> {
  return {
    isAuthorized: false,
    context: { sub: '', email: '', role: '', branch_id: '' },
  };
}
