// @kairos/api - Forms Export Submissions Lambda
// Task 16.7: CSV export of form submissions
// - CSV export with all field values
// - Upload to S3, return presigned URL
// - Apply filters and branch authorization
// - S3 bucket name from env var: process.env.EXPORT_BUCKET

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { eq, and, sql, desc } from 'drizzle-orm';
import { stringify } from 'csv-stringify/sync';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { forms, formSubmissions, members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  handleError,
  successResponse,
  createLogger,
  getDb,
  ForbiddenError,
  NotFoundError,
  isLeader,
} from '@kairos/utils';

const logger = createLogger('forms-export-submissions');

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

/**
 * Lambda handler for exporting form submissions as CSV.
 *
 * Query parameters:
 * - formId (required) - which form's submissions to export
 * - startDate (optional) - filter from date
 * - endDate (optional) - filter to date
 *
 * Access control:
 * - Admins can export any form's submissions
 * - Leaders/Pastors can export only their branch form submissions
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Exporting form submissions', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Restrict to admins and leaders
    if (!isAdmin(ctx) && !isLeader(ctx)) {
      throw new ForbiddenError('Only admins and leaders can export form submissions');
    }

    // 3. Parse query parameters
    const params = event.queryStringParameters || {};
    const formId = params.formId ? parseInt(params.formId, 10) : undefined;
    const startDate = params.startDate;
    const endDate = params.endDate;

    if (!formId) {
      throw new NotFoundError('Form', 'undefined');
    }

    const db = getDb();

    // 4. Fetch the form to verify access and get definition
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.formId, formId))
      .limit(1);

    if (!form) {
      throw new NotFoundError('Form', String(formId));
    }

    // 5. Enforce branch access
    if (
      !isAdmin(ctx) &&
      form.scope === 'Branch-specific' &&
      form.targetBranchId &&
      form.targetBranchId !== ctx.branchId
    ) {
      throw new ForbiddenError('You do not have access to export this form\'s submissions');
    }

    // 6. Build query conditions
    const conditions = [eq(formSubmissions.formId, formId)];

    if (startDate) {
      conditions.push(
        sql`${formSubmissions.submittedAt} >= ${startDate}::timestamp`
      );
    }
    if (endDate) {
      conditions.push(
        sql`${formSubmissions.submittedAt} <= ${endDate}::timestamp`
      );
    }

    const whereClause = and(...conditions);

    // 7. Fetch all matching submissions
    const data = await db
      .select({
        submissionId: formSubmissions.submissionId,
        memberId: formSubmissions.memberId,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
        memberEmail: members.email,
        submissionData: formSubmissions.submissionData,
        submittedAt: formSubmissions.submittedAt,
      })
      .from(formSubmissions)
      .leftJoin(members, eq(formSubmissions.memberId, members.memberId))
      .where(whereClause)
      .orderBy(desc(formSubmissions.submittedAt));

    // 8. Extract field names from form definition for CSV columns
    const formDefinition = form.formDefinition as Record<string, unknown>;
    const fields = (formDefinition.fields as Array<Record<string, unknown>>) || [];
    const fieldNames = fields.map((f) => f.name as string);

    // 9. Build CSV rows
    const csvRows = data.map((row) => {
      const submissionData = (row.submissionData || {}) as Record<string, unknown>;
      const csvRow: Record<string, string> = {
        submission_id: String(row.submissionId),
        member_name: row.memberFirstName && row.memberLastName
          ? `${row.memberFirstName} ${row.memberLastName}`
          : row.memberId ? String(row.memberId) : 'Anonymous',
        member_email: row.memberEmail || '',
        submitted_at: formatDateUK(row.submittedAt),
      };

      // Add each form field as a column
      for (const fieldName of fieldNames) {
        const value = submissionData[fieldName];
        csvRow[fieldName] = value !== undefined && value !== null
          ? Array.isArray(value) ? value.join(', ') : String(value)
          : '';
      }

      return csvRow;
    });

    const csvContent = stringify(csvRows, { header: true });

    // 10. Upload to S3
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `exports/form-submissions-${formId}-${ctx.memberId}-${timestamp}.csv`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: csvContent,
        ContentType: 'text/csv',
      })
    );

    // 11. Generate presigned download URL
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: PRESIGNED_EXPIRY }
    );

    logger.info('Form submissions exported', { formId, count: data.length, key });

    return successResponse({
      downloadUrl,
      fileName: `form-submissions-${formId}-${timestamp}.csv`,
      recordCount: data.length,
      expiresInSeconds: PRESIGNED_EXPIRY,
    });
  } catch (error) {
    return handleError(error, { operation: 'forms-export-submissions' });
  }
};
