// @kairos/api - WebSocket Send Message Lambda (Task 20.3)
// Routes a notification payload to a user's active WebSocket connections.
// Called internally (e.g., by notifications-create) to push real-time updates.
//
// **Requirements: Real-time notifications**

import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { websocketConnections } from '@kairos/database';
import { eq } from 'drizzle-orm';
import { createLogger, getDb } from '@kairos/utils';

const logger = createLogger('ws-send-message');

/** Payload shape for the internal invocation */
export interface WsSendMessagePayload {
  /** Target member IDs to push the message to */
  memberIds: number[];
  /** The notification data to send */
  notification: {
    notificationId: number;
    title: string;
    message: string;
    notificationType: string;
    priority: string;
    sentAt: string;
  };
}

let apiGwClient: ApiGatewayManagementApiClient | null = null;

function getApiGwClient(): ApiGatewayManagementApiClient {
  if (!apiGwClient) {
    const endpoint = process.env['WEBSOCKET_API_ENDPOINT'];
    if (!endpoint) {
      throw new Error('WEBSOCKET_API_ENDPOINT environment variable is required');
    }
    apiGwClient = new ApiGatewayManagementApiClient({ endpoint });
  }
  return apiGwClient;
}

/**
 * Pushes a notification to all active WebSocket connections for the given member IDs.
 * Stale connections (GoneException) are cleaned up automatically.
 */
export async function pushToMembers(payload: WsSendMessagePayload): Promise<{
  sent: number;
  stale: number;
}> {
  const db = getDb();
  let sent = 0;
  let stale = 0;

  for (const memberId of payload.memberIds) {
    // Find all active connections for this member
    const connections = await db
      .select({ connectionId: websocketConnections.connectionId })
      .from(websocketConnections)
      .where(eq(websocketConnections.memberId, memberId));

    for (const conn of connections) {
      try {
        const client = getApiGwClient();
        await client.send(
          new PostToConnectionCommand({
            ConnectionId: conn.connectionId,
            Data: Buffer.from(JSON.stringify(payload.notification)),
          })
        );
        sent++;
      } catch (error) {
        if (error instanceof GoneException || (error instanceof Error && error.name === 'GoneException')) {
          // Connection is stale — clean it up
          await db
            .delete(websocketConnections)
            .where(eq(websocketConnections.connectionId, conn.connectionId));
          stale++;
          logger.info('Removed stale connection', {
            connectionId: conn.connectionId,
            memberId,
          });
        } else {
          logger.error('Failed to send to connection', {
            connectionId: conn.connectionId,
            memberId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  return { sent, stale };
}

/**
 * Lambda handler — invoked directly (e.g., via Lambda invoke or EventBridge).
 * Expects the event body to be a WsSendMessagePayload.
 */
export const handler = async (event: WsSendMessagePayload): Promise<{
  statusCode: number;
  body: string;
}> => {
  try {
    logger.info('Sending WebSocket messages', {
      memberCount: event.memberIds.length,
      notificationId: event.notification.notificationId,
    });

    const result = await pushToMembers(event);

    logger.info('WebSocket messages sent', {
      notificationId: event.notification.notificationId,
      sent: result.sent,
      stale: result.stale,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    logger.error('WebSocket send-message failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send messages' }),
    };
  }
};
