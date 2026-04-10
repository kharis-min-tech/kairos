// @kairos/api - WebSocket Disconnect Lambda (Task 20.2)
// Handles $disconnect route for API Gateway WebSocket API.
// Removes connection_id from database when client disconnects.
//
// **Requirements: Real-time notifications**

import type { APIGatewayProxyResult } from 'aws-lambda';
import { websocketConnections } from '@kairos/database';
import { eq } from 'drizzle-orm';
import { createLogger, getDb } from '@kairos/utils';

const logger = createLogger('ws-disconnect');

/** WebSocket $disconnect event shape */
export interface WebSocketDisconnectEvent {
  requestContext: {
    connectionId: string;
    routeKey: string;
    eventType: string;
    requestId: string;
  };
}

export const handler = async (
  event: WebSocketDisconnectEvent
): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId;

  try {
    const db = getDb();
    await db
      .delete(websocketConnections)
      .where(eq(websocketConnections.connectionId, connectionId));

    logger.info('WebSocket disconnected', { connectionId });

    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    logger.error('WebSocket disconnect failed', {
      connectionId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Still return 200 — connection is gone regardless
    return { statusCode: 200, body: 'Disconnected' };
  }
};
