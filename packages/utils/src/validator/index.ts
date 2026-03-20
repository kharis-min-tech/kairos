// @kairos/validator - Validation layer for the Kairos platform
// Provides Zod schemas for all API request types and validation helpers

export {
  validate,
  validateOrThrow,
  ValidationFailedError,
} from './validate';
export type { ValidationResult, ValidationError } from './validate';

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
} from './custom-validators';

export {
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
} from './schemas';

export type {
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
} from './schemas';
