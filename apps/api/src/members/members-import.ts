// @kairos/api - Members Import Lambda
// Parses CSV file, validates each row, reports errors with row numbers,
// and bulk creates valid member records assigned to specified branch

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parse } from 'csv-parse/sync';
import { eq, and } from 'drizzle-orm';
import { members } from '@kairos/database';
import {
  resolveAuthContext,
  isAdmin,
  isPastor,
  enforceBranchAccess,
  handleError,
  successResponse,
  createLogger,
  getDb,
  ForbiddenError,
  BadRequestError,
} from '@kairos/utils';

const logger = createLogger('members-import');

/** Required CSV columns */
const REQUIRED_COLUMNS = ['first_name', 'last_name', 'home_branch_id'] as const;

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  createdMemberIds: string[];
}

/**
 * Lambda handler for importing members from CSV.
 *
 * Body: { csv: string, branchId: number }
 * The csv field contains the raw CSV content.
 *
 * Access control:
 * - Admin: can import to any branch
 * - Pastor: can import to their branch only
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Extract auth context
    const ctx = await resolveAuthContext(event);
    logger.info('Importing members', { userId: ctx.memberId, branchId: ctx.branchId });

    // 2. Only admins and pastors can import
    if (!isAdmin(ctx) && !isPastor(ctx)) {
      throw new ForbiddenError('Only administrators and pastors can import members');
    }

    // 3. Parse request body
    const body = JSON.parse(event.body || '{}');
    const csvContent = body.csv;
    const targetBranchId = body.branchId ? String(body.branchId) : undefined;

    if (!csvContent || typeof csvContent !== 'string') {
      throw new BadRequestError('CSV content is required');
    }

    if (!targetBranchId) {
      throw new BadRequestError('branchId is required');
    }

    // 4. Enforce branch access
    enforceBranchAccess(ctx, targetBranchId);

    // 5. Parse CSV
    let records: Record<string, string>[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      throw new BadRequestError('Invalid CSV format. Please check the file structure.');
    }

    if (records.length === 0) {
      throw new BadRequestError('CSV file is empty');
    }

    // 6. Validate column headers
    const headers = Object.keys(records[0]!);
    const missingRequired = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
    if (missingRequired.length > 0) {
      throw new BadRequestError(
        `Missing required columns: ${missingRequired.join(', ')}`
      );
    }

    const db = getDb();

    // 7. Validate each row and collect errors
    const errors: ImportError[] = [];
    const validRows: Array<{
      rowIndex: number;
      data: Record<string, string>;
    }> = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i]!;
      const rowNum = i + 2; // +2 for 1-indexed + header row
      let hasError = false;

      // Validate required fields
      if (!row.first_name?.trim()) {
        errors.push({ row: rowNum, field: 'first_name', message: 'First name is required' });
        hasError = true;
      }
      if (!row.last_name?.trim()) {
        errors.push({ row: rowNum, field: 'last_name', message: 'Last name is required' });
        hasError = true;
      }

      // Validate email format if provided
      if (row.email?.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email.trim())) {
          errors.push({ row: rowNum, field: 'email', message: 'Invalid email format' });
          hasError = true;
        }
      }

      // Validate gender if provided
      if (row.gender?.trim() && !['Male', 'Female'].includes(row.gender.trim())) {
        errors.push({ row: rowNum, field: 'gender', message: 'Gender must be Male or Female' });
        hasError = true;
      }

      // Validate date_of_birth if provided
      if (row.date_of_birth?.trim()) {
        const dob = new Date(row.date_of_birth.trim());
        if (isNaN(dob.getTime())) {
          errors.push({ row: rowNum, field: 'date_of_birth', message: 'Invalid date format' });
          hasError = true;
        } else if (dob > new Date()) {
          errors.push({ row: rowNum, field: 'date_of_birth', message: 'Date of birth cannot be in the future' });
          hasError = true;
        }
      }

      if (!hasError) {
        validRows.push({ rowIndex: i, data: row });
      }
    }

    // 8. Check for duplicate emails within the CSV
    const emailsSeen = new Map<string, number>();
    for (const { rowIndex, data } of validRows) {
      const email = data.email?.trim().toLowerCase();
      if (email) {
        if (emailsSeen.has(email)) {
          errors.push({
            row: rowIndex + 2,
            field: 'email',
            message: `Duplicate email in CSV (same as row ${emailsSeen.get(email)})`,
          });
        } else {
          emailsSeen.set(email, rowIndex + 2);
        }
      }
    }

    // 9. Check for duplicate emails/phones against existing active members
    for (const { rowIndex, data } of validRows) {
      const email = data.email?.trim();
      if (email) {
        const existing = await db
          .select({ memberId: members.id })
          .from(members)
          .where(and(eq(members.email, email), eq(members.isActive, true)))
          .limit(1);
        if (existing.length > 0) {
          errors.push({
            row: rowIndex + 2,
            field: 'email',
            message: 'Email already exists for an active member',
          });
        }
      }

      const phone = data.phone?.trim();
      if (phone) {
        const existing = await db
          .select({ memberId: members.id })
          .from(members)
          .where(and(eq(members.phone, phone), eq(members.isActive, true)))
          .limit(1);
        if (existing.length > 0) {
          errors.push({
            row: rowIndex + 2,
            field: 'phone',
            message: 'Phone number already exists for an active member',
          });
        }
      }
    }

    // Filter out rows that had errors in duplicate checks
    const errorRows = new Set(errors.map((e) => e.row));
    const finalValidRows = validRows.filter(
      ({ rowIndex }) => !errorRows.has(rowIndex + 2)
    );

    // 10. Bulk insert valid rows
    const createdMemberIds: string[] = [];

    for (const { data } of finalValidRows) {
      try {
        const [created] = await db
          .insert(members)
          .values({
            firstName: data.first_name!.trim(),
            lastName: data.last_name!.trim(),
            middleName: data.middle_name?.trim() || null,
            email: data.email?.trim() || '',
            phone: data.phone?.trim() || null,
            dateOfBirth: data.date_of_birth?.trim() || null,
            gender: data.gender?.trim() || null,
            address: data.address?.trim() || null,
            city: data.city?.trim() || null,
            postalCode: data.postal_code?.trim() || null,
            homeBranchId: targetBranchId,
            isActive: false, // Imported members start as pending
            passwordHash: 'PENDING', // Placeholder — set when member activates account
            emergencyContactName: data.emergency_contact_name?.trim() || null,
            emergencyContactPhone: data.emergency_contact_phone?.trim() || null,
          })
          .returning();

        createdMemberIds.push(created!.id);
      } catch (err) {
        const rowNum = validRows.indexOf(
          validRows.find((v) => v.data === data)!
        ) + 2;
        errors.push({
          row: rowNum,
          field: 'general',
          message: `Failed to create member: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    }

    const result: ImportResult = {
      totalRows: records.length,
      successCount: createdMemberIds.length,
      errorCount: errors.length,
      errors: errors.sort((a, b) => a.row - b.row),
      createdMemberIds,
    };

    logger.info('Import completed', {
      totalRows: result.totalRows,
      successCount: result.successCount,
      errorCount: result.errorCount,
    });

    return successResponse(result);
  } catch (error) {
    return handleError(error, { operation: 'members-import' });
  }
};
