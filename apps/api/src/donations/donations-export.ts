// @kairos/api - Donations Export Lambda (Task 15.10)
// CSV export with all donation fields.
// Applies current filters and branch authorization.
// Dates formatted DD/MM/YYYY, currency as GBP (£).
// Uploads to S3, returns presigned URL.
// Follows the same pattern as members-export.ts.
//
// **Requirements: 15.10**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { donations, members } from '@kairos/database';
import { eq, and, sql, desc, between } from 'drizzle-orm';
import { stringify } from 'csv-stringify/sync';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('donations-export');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-2' });
const BUCKET = process.env.EXPORT_BUCKET || 'kairos-staging-csv-exports';
const PRESIGNED_EXPIRY = 3600; // 1 hour

/** Format a date string or Date as DD/MM/YYYY in UK timezone */
function formatDateUK(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { timeZone: 'Europe/London' });
}

/** Format amount as GBP with £ symbol */
function formatGBP(amount: string | null | undefined): string {
  if (!amount) return '£0.00';
  const num = parseFloat(amount);
  return `£${num.toFixed(2)}`;
}

/**
 * Lambda handler for exporting donations as CSV.
 *
 * Query parameters:
 * - branchId (admin only — pastors auto-scoped)
 * - memberId (filter by specific member)
 * - dateFrom / dateTo (date range filter, YYYY-MM-DD)
 * - purpose (filter by donation purpose)
 * - status (filter by status)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Exporting donations', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = event.queryStringParameters || {};
    const branchIdFilter = params.branchId ? parseInt(params.branchId, 10) : undefined;
    const memberId = params.memberId ? parseInt(params.memberId, 10) : undefined;
    const dateFrom = params.dateFrom;
    const dateTo = params.dateTo;
    const purpose = params.purpose;
    const status = params.status;

    const db = getDb();

    // Build WHERE conditions (same logic as donations-list)
    const conditions = [];

    // Branch isolation: non-admins see only their branch
    if (!isAdmin(ctx)) {
      conditions.push(eq(donations.branchId, ctx.branchId));
    } else if (branchIdFilter) {
      conditions.push(eq(donations.branchId, branchIdFilter));
    }

    if (memberId) {
      conditions.push(eq(donations.memberId, memberId));
    }

    if (dateFrom && dateTo) {
      conditions.push(between(donations.donationDate, dateFrom, dateTo));
    } else if (dateFrom) {
      conditions.push(sql`${donations.donationDate} >= ${dateFrom}`);
    } else if (dateTo) {
      conditions.push(sql`${donations.donationDate} <= ${dateTo}`);
    }

    if (purpose) {
      conditions.push(eq(donations.donationPurpose, purpose));
    }

    if (status) {
      conditions.push(eq(donations.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get all matching donations with member names
    const data = await db
      .select({
        donationId: donations.donationId,
        memberId: donations.memberId,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
        branchId: donations.branchId,
        donationDate: donations.donationDate,
        amount: donations.amount,
        currency: donations.currency,
        donationPurpose: donations.donationPurpose,
        description: donations.description,
        paymentMethod: donations.paymentMethod,
        referenceNumber: donations.referenceNumber,
        status: donations.status,
        isAnonymous: donations.isAnonymous,
        notes: donations.notes,
        recordedBy: donations.recordedBy,
        createdAt: donations.createdAt,
      })
      .from(donations)
      .leftJoin(members, eq(donations.memberId, members.memberId))
      .where(whereClause)
      .orderBy(desc(donations.donationDate));

    // Build CSV rows
    const csvRows = data.map((d) => ({
      donation_id: d.donationId,
      donor_name: d.isAnonymous
        ? 'Anonymous'
        : d.memberFirstName && d.memberLastName
          ? `${d.memberFirstName} ${d.memberLastName}`
          : d.memberFirstName || '',
      member_id: d.isAnonymous ? '' : (d.memberId ?? ''),
      branch_id: d.branchId,
      donation_date: formatDateUK(d.donationDate),
      amount: formatGBP(d.amount),
      currency: d.currency || 'GBP',
      purpose: d.donationPurpose,
      description: d.description || '',
      payment_method: d.paymentMethod || '',
      reference_number: d.referenceNumber || '',
      status: d.status || '',
      is_anonymous: d.isAnonymous ? 'Yes' : 'No',
      notes: d.notes || '',
      recorded_by: d.recordedBy ?? '',
      created_at: formatDateUK(d.createdAt),
    }));

    const csvContent = stringify(csvRows, { header: true });

    // Upload to S3
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `exports/donations-${ctx.memberId}-${timestamp}.csv`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: csvContent,
        ContentType: 'text/csv',
      })
    );

    // Generate presigned download URL
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: PRESIGNED_EXPIRY }
    );

    logger.info('Donations exported', { count: data.length, key });

    return successResponse({
      downloadUrl,
      fileName: `donations-export-${timestamp}.csv`,
      recordCount: data.length,
      expiresInSeconds: PRESIGNED_EXPIRY,
    });
  } catch (error) {
    return handleError(error, { operation: 'donations-export' });
  }
};
