// @kairos/api - WebSocket Connect Lambda (Task 20.1)
// Handles $connect route for API Gateway WebSocket API.
// Validates JWT from query string, stores connection_id with member_id in database.
//
// **Requirements: Real-time notifications**

import type { APIGatewayProxyResult } from 'aws-lambda';
import { websocketConnections } from '@kairos/database';
import { verifyCognitoToken } from '../auth/cognito';
import { lookupMember } from '../auth/member-lookup';
import { createLogger, getDb } from '@kairos/utils';

const logger = createLogger('ws-connect');

/** WebSocket $connect event shape */
export interface WebSocketConnectEvent {
  requestContext: {
    connectionId: string;
    routeKey: string;
    eventType: string;
    requestId: string;
  };
  queryStringParameters?: Record<string, string> | null;
}

export const handler = async (
  event: WebSocketConnectEvent
): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId;

  try {
    // 1. Extract JWT from query string (?token=<jwt>)
    const token = event.queryStringParameters?.['token'];
    if (!token) {
      logger.warn('Missing token in query string', { connectionId });
      return { statusCode: 401, body: 'Unauthorized: missing token' };
    }

    // 2. Verify JWT with Cognito
    const payload = await verifyCognitoToken(token);
    const email = payload.email;
    if (!email) {
      logger.warn('JWT missing email claim', { connectionId, sub: payload.sub });
      return { statusCode: 401, body: 'Unauthorized: missing email' };
    }

    // 3. Look up member to get member_id and verify active status
    const member = await lookupMember(email, payload['custom:role']);

    // 4. Store connection in database
    const db = getDb();
    await db.insert(websocketConnections).values({
      connectionId,
      memberId: member.memberId,
    });

    logger.info('WebSocket connected', {
      connectionId,
      memberId: member.memberId,
    });

    return { statusCode: 200, body: 'Connected' };
  } catch (error) {
    logger.error('WebSocket connect failed', {
      connectionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { statusCode: 401, body: 'Unauthorized' };
  }
};
