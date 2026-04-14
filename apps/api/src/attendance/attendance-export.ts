// @kairos/api - Attendance Export Lambda
// Generates CSV with member names, dates, statuses.
// Applies filters and branch authorization.
// Dates formatted DD/MM/YYYY.
//
// **Requirements: 12.6**

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, gte, lte, asc } from 'drizzle-orm';
import { stringify } from 'csv-stringify/sync';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { services, serviceAttendance, members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
  ForbiddenError,
} from '@kairos/utils';

const logger = createLogger('attendance-export');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-2' });
const BUCKET = process.env.CSV_EXPORT_BUCKET || 'kairos-staging-csv-exports';
const PRESIGNED_EXPIRY = 3600;

function formatDateUK(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { timeZone: 'Europe/London' });
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const ctx = await resolveAuthContext(event);
    logger.info('Exporting attendance', { userId: ctx.memberId, branchId: ctx.branchId });

    const params = (event.queryStringParameters || {}) as Record<string, string>;
    const branchId = params.branchId || ctx.branchId;
    const serviceType = params.serviceType;
    const dateFrom = params.dateFrom;
    const dateTo = params.dateTo;

    // Branch isolation
    if (!isAdmin(ctx) && branchId !== ctx.branchId) {
      throw new ForbiddenError('Access denied to this branch');
    }

    const db = getDb();

    // Build conditions
    const conditions = [eq(services.branchId, branchId)];

    if (serviceType) {
      conditions.push(eq(services.serviceType, serviceType));
    }
    if (dateFrom) {
      conditions.push(gte(services.serviceDate, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(services.serviceDate, new Date(dateTo)));
    }

    // Get attendance records with member names and service info
    const data = await db
      .select({
        serviceDate: services.serviceDate,
        serviceType: services.serviceType,
        serviceTitle: services.serviceTitle,
        memberId: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        attendanceStatus: serviceAttendance.attendanceStatus,
        isFirstTimeVisitor: serviceAttendance.isFirstTimeVisitor,
        notes: serviceAttendance.notes,
      })
      .from(serviceAttendance)
      .innerJoin(services, eq(serviceAttendance.serviceId, services.id))
      .innerJoin(members, eq(serviceAttendance.memberId, members.id))
      .where(and(...conditions))
      .orderBy(asc(services.serviceDate));

    const csvRows = data.map(r => ({
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

    const csvContent = stringify(csvRows, { header: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `exports/attendance-${ctx.memberId}-${timestamp}.csv`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: csvContent,
        ContentType: 'text/csv',
      })
    );

    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: PRESIGNED_EXPIRY }
    );

    logger.info('Attendance exported', { count: data.length, key });

    return successResponse({
      downloadUrl,
      fileName: `attendance-export-${timestamp}.csv`,
      recordCount: data.length,
      expiresInSeconds: PRESIGNED_EXPIRY,
    });
  } catch (error) {
    return handleError(error);
  }
};
