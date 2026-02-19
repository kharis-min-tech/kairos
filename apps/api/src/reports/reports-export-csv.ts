// @kairos/api - Reports Export CSV Lambda (Task 21.8)
// Generic CSV export for any report data type.
// Supports: members, donations, attendance, souls.
// Applies filters and branch authorization.
// Uploads to S3, returns presigned download URL.
// Follows the same S3 pattern as donations-export.ts.
//
// **Requirements: 29.7**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  members,
  donations,
  services,
  serviceAttendance,
  souls,
  outreachPrograms,
} from '@kairos/database';
import { eq, and, sql, desc, asc, gte, lte, between } from 'drizzle-orm';
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
  ForbiddenError,
  BadRequestError,
} from '@kairos/utils';

const logger = createLogger('reports-export-csv');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-2' });
const BUCKET = process.env.CSV_EXPORT_BUCKET || 'kairos-staging-csv-exports';
const PRESIGNED_EXPIRY = 3600; // 1 hour

const VALID_TYPES = ['members', 'donations', 'attendance', 'souls'] as const;
type ExportType = (typeof VALID_TYPES)[number];

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
 * Lambda handler for generic CSV export.
 *
 * Query parameters:
 * - type (required): 'members' | 'donations' | 'attendance' | 'souls'
 * - branchId (admin only — pastors auto-scoped)
 * - dateFrom / dateTo (optional date range, YYYY-MM-DD)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Exporting CSV report', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Parse and validate query parameters
    const params = event.queryStringParameters || {};
    const exportType = params.type as ExportType;

    if (!exportType || !VALID_TYPES.includes(exportType)) {
      throw new BadRequestError(
        `Invalid export type. Must be one of: ${VALID_TYPES.join(', ')}`
      );
    }

    const branchId = params.branchId ? parseInt(params.branchId, 10) : ctx.branchId;
    const dateFrom = params.dateFrom;
    const dateTo = params.dateTo;

    // 3. Branch isolation: non-admins see only their branch
    if (!isAdmin(ctx)) {
      if (branchId !== ctx.branchId) {
        throw new ForbiddenError('Access denied to this branch');
      }
    }

    const db = getDb();

    // 4. Export based on type
    let csvContent: string;
    let recordCount: number;

    switch (exportType) {
      case 'members': {
        const result = await exportMembers(db, branchId, isAdmin(ctx));
        csvContent = result.csv;
        recordCount = result.count;
        break;
      }
      case 'donations': {
        const result = await exportDonations(db, branchId, isAdmin(ctx), dateFrom, dateTo);
        csvContent = result.csv;
        recordCount = result.count;
        break;
      }
      case 'attendance': {
        const result = await exportAttendance(db, branchId, dateFrom, dateTo);
        csvContent = result.csv;
        recordCount = result.count;
        break;
      }
      case 'souls': {
        const result = await exportSouls(db, branchId, dateFrom, dateTo);
        csvContent = result.csv;
        recordCount = result.count;
        break;
      }
    }

    // 5. Upload to S3
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `exports/${exportType}-${ctx.memberId}-${timestamp}.csv`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: csvContent,
        ContentType: 'text/csv',
      })
    );

    // 6. Generate presigned download URL
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: PRESIGNED_EXPIRY }
    );

    logger.info('CSV report exported', { type: exportType, count: recordCount, key });

    return successResponse({
      downloadUrl,
      fileName: `${exportType}-export-${timestamp}.csv`,
      recordCount,
      expiresInSeconds: PRESIGNED_EXPIRY,
    });
  } catch (error) {
    return handleError(error);
  }
};


// ---------------------------------------------------------------------------
// Export helper functions
// ---------------------------------------------------------------------------

/** Export members as CSV */
async function exportMembers(
  db: ReturnType<typeof getDb>,
  branchId: number,
  admin: boolean
): Promise<{ csv: string; count: number }> {
  const conditions = [eq(members.isActive, true)];

  if (!admin) {
    conditions.push(eq(members.homeBranchId, branchId));
  } else {
    conditions.push(eq(members.homeBranchId, branchId));
  }

  const data = await db
    .select()
    .from(members)
    .where(and(...conditions))
    .orderBy(asc(members.lastName), asc(members.firstName));

  const csvRows = data.map((m) => ({
    member_id: m.memberId,
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
    created_at: formatDateUK(m.createdAt),
  }));

  return {
    csv: stringify(csvRows, { header: true }),
    count: data.length,
  };
}

/** Export donations as CSV with member names */
async function exportDonations(
  db: ReturnType<typeof getDb>,
  branchId: number,
  admin: boolean,
  dateFrom?: string,
  dateTo?: string
): Promise<{ csv: string; count: number }> {
  const conditions = [];

  if (!admin) {
    conditions.push(eq(donations.branchId, branchId));
  } else {
    conditions.push(eq(donations.branchId, branchId));
  }

  if (dateFrom && dateTo) {
    conditions.push(between(donations.donationDate, dateFrom, dateTo));
  } else if (dateFrom) {
    conditions.push(sql`${donations.donationDate} >= ${dateFrom}`);
  } else if (dateTo) {
    conditions.push(sql`${donations.donationDate} <= ${dateTo}`);
  }

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
      createdAt: donations.createdAt,
    })
    .from(donations)
    .leftJoin(members, eq(donations.memberId, members.memberId))
    .where(and(...conditions))
    .orderBy(desc(donations.donationDate));

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
    created_at: formatDateUK(d.createdAt),
  }));

  return {
    csv: stringify(csvRows, { header: true }),
    count: data.length,
  };
}

/** Export attendance records as CSV */
async function exportAttendance(
  db: ReturnType<typeof getDb>,
  branchId: number,
  dateFrom?: string,
  dateTo?: string
): Promise<{ csv: string; count: number }> {
  const conditions = [eq(services.branchId, branchId)];

  if (dateFrom) {
    conditions.push(gte(services.serviceDate, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(services.serviceDate, new Date(dateTo)));
  }

  const data = await db
    .select({
      serviceDate: services.serviceDate,
      serviceType: services.serviceType,
      serviceTitle: services.serviceTitle,
      memberId: members.memberId,
      firstName: members.firstName,
      lastName: members.lastName,
      attendanceStatus: serviceAttendance.attendanceStatus,
      isFirstTimeVisitor: serviceAttendance.isFirstTimeVisitor,
      notes: serviceAttendance.notes,
    })
    .from(serviceAttendance)
    .innerJoin(services, eq(serviceAttendance.serviceId, services.serviceId))
    .innerJoin(members, eq(serviceAttendance.memberId, members.memberId))
    .where(and(...conditions))
    .orderBy(asc(services.serviceDate));

  const csvRows = data.map((r) => ({
    service_date: formatDateUK(r.serviceDate),
    service_type: r.serviceType,
    service_title: r.serviceTitle || '',
    member_id: r.memberId,
    first_name: r.firstName,
    last_name: r.lastName,
    attendance_status: r.attendanceStatus,
    is_first_time_visitor: r.isFirstTimeVisitor ? 'Yes' : 'No',
    notes: r.notes || '',
  }));

  return {
    csv: stringify(csvRows, { header: true }),
    count: data.length,
  };
}

/** Export souls as CSV */
async function exportSouls(
  db: ReturnType<typeof getDb>,
  branchId: number,
  dateFrom?: string,
  dateTo?: string
): Promise<{ csv: string; count: number }> {
  const conditions = [eq(outreachPrograms.branchId, branchId)];

  if (dateFrom) {
    conditions.push(gte(souls.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(souls.createdAt, new Date(dateTo)));
  }

  const data = await db
    .select({
      soulId: souls.soulId,
      firstName: souls.firstName,
      lastName: souls.lastName,
      phone: souls.phone,
      email: souls.email,
      address: souls.address,
      city: souls.city,
      gender: souls.gender,
      ageRange: souls.ageRange,
      status: souls.status,
      notes: souls.notes,
      programName: outreachPrograms.programName,
      programDate: outreachPrograms.programDate,
      createdAt: souls.createdAt,
    })
    .from(souls)
    .innerJoin(outreachPrograms, eq(souls.outreachId, outreachPrograms.outreachId))
    .where(and(...conditions))
    .orderBy(desc(souls.createdAt));

  const csvRows = data.map((s) => ({
    soul_id: s.soulId,
    first_name: s.firstName,
    last_name: s.lastName,
    phone: s.phone || '',
    email: s.email || '',
    address: s.address || '',
    city: s.city || '',
    gender: s.gender || '',
    age_range: s.ageRange || '',
    status: s.status || '',
    notes: s.notes || '',
    outreach_program: s.programName,
    program_date: formatDateUK(s.programDate),
    created_at: formatDateUK(s.createdAt),
  }));

  return {
    csv: stringify(csvRows, { header: true }),
    count: data.length,
  };
}
