import {
  pgTable,
  varchar,
  timestamp,
  index,
  primaryKey,
  uuid,
} from 'drizzle-orm/pg-core';
import { members } from './members';

// ============================================================================
// WEBSOCKET_CONNECTIONS
// Purpose: Track active WebSocket connections for real-time notification delivery
// ============================================================================
export const websocketConnections = pgTable(
  'websocket_connections',
  {
    connectionId: varchar('connection_id', { length: 128 }).notNull(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    connectedAt: timestamp('connected_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.connectionId] }),
    index('idx_ws_connections_member_id').on(table.memberId),
  ]
);
