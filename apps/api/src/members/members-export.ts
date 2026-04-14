// @kairos/api - Members Export Lambda
// Generates CSV from member data with current filters/search,
// uploads to S3, and returns a presigned download URL.
// Enforces branch isolation (pastors export only their branch).
// Dates formatted as DD/MM/YYYY (UK timezone).
//
// **Requirements: 5.5-5.7, 31.2-31.6**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, or, ilike, asc, desc } from 'drizzle-orm';
import { stringify } from 'csv-stringify/sync';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
} from '@kairos/utils';

const logger = createLogger('members-export');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-2' });
const BUCKET = process.env.CSV_EXPORT_BUCKET || 'kairos-staging-csv-exports';
const PRESIGNED_EXPIRY = 3600; // 1 hour

/** Format a date string or Date as DD/MM/YYYY in UK timezone */
function formatDateUK(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { timeZone: 'Europe/London' });
}

/** Allowed sort columns */
const SORT_COLUMNS: Record<string, any> = {
  lastName: members.lastName,
  firstName: members.firstName,
  membershipDate: members.membershipDate,
  email: members.email,
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Exporting members', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = event.queryStringParameters || {};
    const search = params.search?.trim();
    const branchIdFilter = params.branchId ?? undefined;
    const status = params.status || 'active';
    const sortBy = params.sortBy || 'lastName';
    const sortOrder = params.sortOrder === 'desc' ? 'desc' : 'asc';

    const db = getDb();

    // Build WHERE conditions (same logic as members-list)
    const conditions = [];

    if (!isAdmin(ctx)) {
      conditions.push(eq(members.homeBranchId, ctx.branchId));
    } else if (branchIdFilter) {
      conditions.push(eq(members.homeBranchId, branchIdFilter));
    }

    if (status === 'active') {
      conditions.push(eq(members.isActive, true));
    } else if (status === 'pending') {
      conditions.push(eq(members.isActive, false));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(members.firstName, searchPattern),
          ilike(members.lastName, searchPattern),
          ilike(members.email, searchPattern),
          ilike(members.phone, searchPattern),
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMNS[sortBy] || members.lastName;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const data = await db
      .select()
      .from(members)
      .where(whereClause)
      .orderBy(orderFn(sortColumn));

    // Build CSV rows
    const csvRows = data.map((m) => ({
      member_id: m.id,
      first_name: m.firstName,
      last_name: m.lastName,
      middle_name: m.middleName || '',
      email: m.email || '',
      phone: m.phone || '',
      date_of_birth: formatDateUK(m.dateOfBirth),
      gender: m.gender || '',
      address: m.address || '',
      city: m.city || '',
      postal_code: m.postalCode || '',
      home_branch_id: m.homeBranchId,
      membership_date: formatDateUK(m.membershipDate),
      is_active: m.isActive ? 'Yes' : 'No',
      emergency_contact_name: m.emergencyContactName || '',
      emergency_contact_phone: m.emergencyContactPhone || '',
    }));

    const csvContent = stringify(csvRows, { header: true });

    // Upload to S3
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `exports/members-${ctx.memberId}-${timestamp}.csv`;

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

    logger.info('Members exported', { count: data.length, key });

    return successResponse({
      downloadUrl,
      fileName: `members-export-${timestamp}.csv`,
      recordCount: data.length,
      expiresInSeconds: PRESIGNED_EXPIRY,
    });
  } catch (error) {
    return handleError(error, { operation: 'members-export' });
  }
};
