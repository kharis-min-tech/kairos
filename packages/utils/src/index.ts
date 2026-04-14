// ─── Legacy flat-file exports (kept for backward compatibility) ───────────────
export { errorResponse, paginatedResponse, parsePagination } from './response';
export {
  sendPasswordResetEmail,
  sendJoinRequestReceivedEmail,
  sendJoinRequestApprovedEmail,
  sendJoinRequestRejectedEmail,
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
} from './mailer';

// ─── Error-handler sub-module (canonical error classes + Lambda helpers) ──────
export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  ErrorCode,
  handleError,
  successResponse,
  createdResponse,
} from './error-handler';
export type { ErrorDetail, ErrorResponseBody, LambdaResponse } from './error-handler';

// ─── Auth-context sub-module ──────────────────────────────────────────────────
export { getAuthContext, resolveAuthContext } from './auth-context/context';
export type { AuthContext, UserRole } from './auth-context/context';
export {
  isAdmin,
  isPastor,
  isLeader,
  isMember,
  hasRole,
  enforceBranchAccess,
  canAccessBranch,
} from './auth-context/permissions';

// ─── DB-client sub-module ─────────────────────────────────────────────────────
export { createDbClient, getDb, initDb, resetDb } from './db-client/client';
export type { DbClient, TransactionClient } from './db-client/client';

// ─── Logger sub-module ────────────────────────────────────────────────────────
export { Logger, createLogger, logger } from './logger/logger';
export type { LogLevel, LogContext } from './logger/logger';

// ─── Validator sub-module ─────────────────────────────────────────────────────
export { validate, validateOrThrow, ValidationFailedError } from './validator';
export type { ValidationResult } from './validator/validate';

// ─── Zod schemas (for API request validation) ──────────────────────────────────
export {
  ukPhoneSchema,
  phoneSchema,
  ukDateSchema,
  parseUkDate,
  formatUkDate,
  nonEmptyString,
  positiveAmount,
  paginationSchema,
  sortSchema,
  memberCreateSchema,
  memberUpdateSchema,
  branchCreateSchema,
  departmentCreateSchema,
  branchDepartmentCreateSchema,
  fellowshipCreateSchema,
  serviceCreateSchema,
  serviceAttendanceBulkSchema,
  attendanceRecordSchema,
  fellowshipMeetingCreateSchema,
  fellowshipAttendanceBulkSchema,
  fellowshipAttendanceRecordSchema,
  outreachProgramCreateSchema,
  outreachWorkerRegisterSchema,
  outreachCompleteSchema,
  soulCaptureSchema,
  followUpCreateSchema,
  soulStatusUpdateSchema,
  soulReassignSchema,
  donationCreateSchema,
  formCreateSchema,
  formSubmitSchema,
  notificationCreateSchema,
} from './validator';
