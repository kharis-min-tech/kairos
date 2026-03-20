// @kairos/api - Analytics Export to S3 Lambda
// Scheduled Lambda (EventBridge) that exports key database tables to S3
// in JSON Lines (.jsonl) format for Power BI consumption.
//
// Exports: members, donations, attendance (services + service_attendance),
//          souls, branches, departments, fellowships
//
// Design decisions:
// - Uses JSONL format (one JSON object per line) for Power BI compatibility
//   and streaming-friendly processing. Parquet conversion is a future optimization.
// - Queries use batched reads with LIMIT/OFFSET to avoid memory pressure
//   and reduce impact on production database.
// - No auth context needed — this is a system-level scheduled job.
// - S3 key path includes date for versioning: analytics/YYYY-MM-DD/<table>.jsonl
//
// **Requirements: 30.1, 30.2, 30.4, 30.6**

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  members,
  donations,
  services,
  serviceAttendance,
  souls,
  branches,
  departments,
  branchDepartments,
  fellowships,
  fellowshipMembers,
} from '@kairos/database';
import { getDb, createLogger } from '@kairos/utils';

const logger = createLogger('analytics-export-to-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-2' });
const BUCKET = process.env.ANALYTICS_EXPORT_BUCKET || 'kairos-staging-analytics-exports';
const BATCH_SIZE = 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportResult {
  table: string;
  recordCount: number;
  s3Key: string;
  durationMs: number;
}

interface ExportSummary {
  exportDate: string;
  tables: ExportResult[];
  totalRecords: number;
  totalDurationMs: number;
  errors: Array<{ table: string; error: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns today's date formatted as YYYY-MM-DD in UK timezone.
 */
function getExportDate(): string {
  const now = new Date();
  // Format in UK timezone
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;
  return `${year}-${month}-${day}`;
}

/**
 * Serialises a single database row to a JSON string for JSONL output.
 * Handles Date objects and other special types.
 */
function serialiseRow(row: Record<string, unknown>): string {
  return JSON.stringify(row, (_key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  });
}

/**
 * Queries a table in batches and streams results as JSONL to S3.
 * Uses LIMIT/OFFSET pagination to keep memory usage bounded and
 * avoid locking production database resources for extended periods.
 */
async function exportTable(
  tableName: string,
  queryFn: (offset: number, limit: number) => Promise<Record<string, unknown>[]>,
  s3KeyPrefix: string,
): Promise<ExportResult> {
  const startTime = Date.now();
  const s3Key = `${s3KeyPrefix}/${tableName}.jsonl`;
  const lines: string[] = [];
  let offset = 0;
  let totalRecords = 0;

  logger.info(`Starting export for table: ${tableName}`);

  // Fetch in batches to limit memory usage and DB load
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await queryFn(offset, BATCH_SIZE);

    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      lines.push(serialiseRow(row));
    }

    totalRecords += batch.length;
    offset += BATCH_SIZE;

    logger.debug(`Fetched batch for ${tableName}`, {
      offset,
      batchSize: batch.length,
      totalSoFar: totalRecords,
    });

    // If we got fewer than BATCH_SIZE, we've reached the end
    if (batch.length < BATCH_SIZE) {
      break;
    }
  }

  // Upload JSONL content to S3
  const body = lines.join('\n');

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: body,
      ContentType: 'application/jsonl',
      Metadata: {
        'export-date': getExportDate(),
        'record-count': String(totalRecords),
        'table-name': tableName,
      },
    }),
  );

  const durationMs = Date.now() - startTime;

  logger.info(`Completed export for table: ${tableName}`, {
    recordCount: totalRecords,
    s3Key,
    durationMs,
  });

  return { table: tableName, recordCount: totalRecords, s3Key, durationMs };
}

// ---------------------------------------------------------------------------
// Table export definitions
// ---------------------------------------------------------------------------

/**
 * Defines how each table is queried for export.
 * Each entry returns a batch query function that accepts offset and limit.
 * Queries only active/relevant records to keep exports clean.
 */
function getTableExporters(db: ReturnType<typeof getDb>) {
  return [
    {
      name: 'members',
      query: (offset: number, limit: number) =>
        db
          .select()
          .from(members)
          .limit(limit)
          .offset(offset)
          .then((rows) => rows as Record<string, unknown>[]),
    },
    {
      name: 'donations',
      query: (offset: number, limit: number) =>
        db
          .select()
          .from(donations)
          .limit(limit)
          .offset(offset)
          .then((rows) => rows as Record<string, unknown>[]),
    },
    {
      name: 'services',
      query: (offset: number, limit: number) =>
        db
          .select()
          .from(services)
          .limit(limit)
          .offset(offset)
          .then((rows) => rows as Record<string, unknown>[]),
    },
    {
      name: 'service_attendance',
      query: (offset: number, limit: number) =>
        db
          .select()
          .from(serviceAttendance)
          .limit(limit)
          .offset(offset)
          .then((rows) => rows as Record<string, unknown>[]),
    },
    {
      name: 'souls',
      query: (offset: number, limit: number) =>
        db
          .select()
          .from(souls)
          .limit(limit)
          .offset(offset)
          .then((rows) => rows as Record<string, unknown>[]),
    },
    {
      name: 'branches',
      query: (offset: number, limit: number) =>
        db
          .select()
          .from(branches)
          .limit(limit)
          .offset(offset)
          .then((rows) => rows as Record<string, unknown>[]),
    },
    {
      name: 'departments',
      query: (offset: number, limit: number) =>
        db
          .select()
          .from(departments)
          .limit(limit)
          .offset(offset)
          .then((rows) => rows as Record<string, unknown>[]),
    },
    {
      name: 'branch_departments',
      query: (offset: number, limit: number) =>
        db
          .select()
          .from(branchDepartments)
          .limit(limit)
          .offset(offset)
          .then((rows) => rows as Record<string, unknown>[]),
    },
    {
      name: 'fellowships',
      query: (offset: number, limit: number) =>
        db
          .select()
          .from(fellowships)
          .limit(limit)
          .offset(offset)
          .then((rows) => rows as Record<string, unknown>[]),
    },
    {
      name: 'fellowship_members',
      query: (offset: number, limit: number) =>
        db
          .select()
          .from(fellowshipMembers)
          .limit(limit)
          .offset(offset)
          .then((rows) => rows as Record<string, unknown>[]),
    },
  ];
}

// ---------------------------------------------------------------------------
// EventBridge scheduled event type
// ---------------------------------------------------------------------------

interface ScheduledEvent {
  source: string;
  'detail-type': string;
  detail: Record<string, unknown>;
  time: string;
  region: string;
  account: string;
}

// ---------------------------------------------------------------------------
// Lambda handler
// ---------------------------------------------------------------------------

export const handler = async (
  event: ScheduledEvent,
): Promise<ExportSummary> => {
  const overallStart = Date.now();
  const exportDate = getExportDate();
  const s3KeyPrefix = `analytics/${exportDate}`;

  logger.info('Analytics export started', {
    exportDate,
    bucket: BUCKET,
    s3KeyPrefix,
    eventSource: event.source,
  });

  const db = getDb();
  const exporters = getTableExporters(db);

  const results: ExportResult[] = [];
  const errors: Array<{ table: string; error: string }> = [];

  // Export tables sequentially to avoid overwhelming the database
  for (const exporter of exporters) {
    try {
      const result = await exportTable(exporter.name, exporter.query, s3KeyPrefix);
      results.push(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to export table: ${exporter.name}`, err, {
        table: exporter.name,
      });
      errors.push({ table: exporter.name, error: errorMessage });
    }
  }

  const totalRecords = results.reduce((sum, r) => sum + r.recordCount, 0);
  const totalDurationMs = Date.now() - overallStart;

  const summary: ExportSummary = {
    exportDate,
    tables: results,
    totalRecords,
    totalDurationMs,
    errors,
  };

  if (errors.length > 0) {
    logger.warn('Analytics export completed with errors', {
      exportDate,
      successfulTables: results.length,
      failedTables: errors.length,
      totalRecords,
      totalDurationMs,
      errors,
    });
  } else {
    logger.info('Analytics export completed successfully', {
      exportDate,
      tablesExported: results.length,
      totalRecords,
      totalDurationMs,
    });
  }

  return summary;
};
