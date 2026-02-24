// @kairos/utils - Shared utility functions for the Kairos platform
// Re-exports all shared layers for convenient imports

// Database client layer (@kairos/db-client)
export { createDbClient, getDb, initDb, resetDb } from './db-client';
export type { DbClient, TransactionClient } from './db-client';

// Validation layer (@kairos/validator)
export {
  validate,
  validateOrThrow,
  ValidationFailedError,
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
export type {
  ValidationResult,
  ValidationError,
  MemberCreateInput,
  MemberUpdateInput,
  BranchCreateInput,
  DepartmentCreateInput,
  BranchDepartmentCreateInput,
  FellowshipCreateInput,
  ServiceCreateInput,
  ServiceAttendanceBulkInput,
  AttendanceRecordInput,
  FellowshipMeetingCreateInput,
  FellowshipAttendanceBulkInput,
  FellowshipAttendanceRecordInput,
  OutreachProgramCreateInput,
  OutreachWorkerRegisterInput,
  OutreachCompleteInput,
  SoulCaptureInput,
  FollowUpCreateInput,
  SoulStatusUpdateInput,
  SoulReassignInput,
  DonationCreateInput,
  FormCreateInput,
  FormSubmitInput,
  NotificationCreateInput,
} from './validator';

// Error handler layer (@kairos/error-handler)
export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError as ApiValidationError,
  InternalServerError,
  ErrorCode,
  handleError,
  successResponse,
  createdResponse,
} from './error-handler';
export type {
  ErrorDetail,
  ErrorResponseBody,
  LambdaResponse,
} from './error-handler';

// Auth context layer (@kairos/auth-context)
export {
  getAuthContext,
  resolveAuthContext,
  isAdmin,
  isPastor,
  isLeader,
  isMember,
  hasRole,
  enforceBranchAccess,
  canAccessBranch,
} from './auth-context';
export type { AuthContext } from './auth-context';

// Logger layer (@kairos/logger)
export { Logger, createLogger, logger } from './logger';
export type { LogLevel, LogContext } from './logger';
