// ── Enums ──────────────────────────────────────────────────
// Mirrors database CHECK constraints as TypeScript const enums

export const BranchType = {
  Main: 'Main',
  Satellite: 'Satellite',
  Cell: 'Cell',
  Campus: 'Campus',
  Online: 'Online',
} as const;
export type BranchType = (typeof BranchType)[keyof typeof BranchType];

export const Gender = {
  Male: 'Male',
  Female: 'Female',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const LeadershipRole = {
  MainPastor: 'Main Pastor',
  Elder: 'Elder',
} as const;
export type LeadershipRole = (typeof LeadershipRole)[keyof typeof LeadershipRole];

export const AttendanceStatus = {
  Present: 'Present',
  Absent: 'Absent',
  Excused: 'Excused',
  Late: 'Late',
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const FellowshipType = {
  KGroups: 'K-Groups',
  KharisExpress: 'Kharis Express',
  NewBreeds: 'New Breeds',
  KharisOnCampus: 'Kharis on Campus',
  KharisOnCampusColleges: 'Kharis on Campus Colleges',
} as const;
export type FellowshipType = (typeof FellowshipType)[keyof typeof FellowshipType];

export const MemberApprovalStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;
export type MemberApprovalStatus = (typeof MemberApprovalStatus)[keyof typeof MemberApprovalStatus];

// ── Auth / System Roles ────────────────────────────────────

export const SystemRole = {
  Admin: 'admin',
  Pastor: 'pastor',
  Leader: 'leader',
  Member: 'member',
} as const;
export type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];

// ── Outreach / Evangelism ──────────────────────────────────

export const SoulStatus = {
  New: 'New',
  FollowingUp: 'Following Up',
  Interested: 'Interested',
  NotInterested: 'Not Interested',
  Converted: 'Converted',
  LostContact: 'Lost Contact',
} as const;
export type SoulStatus = (typeof SoulStatus)[keyof typeof SoulStatus];

export const ContactMethod = {
  PhoneCall: 'Phone Call',
  TextMessage: 'Text Message',
  Email: 'Email',
  WhatsApp: 'WhatsApp',
  InPersonVisit: 'In-Person Visit',
  Other: 'Other',
} as const;
export type ContactMethod = (typeof ContactMethod)[keyof typeof ContactMethod];

export const ContactStatus = {
  Successful: 'Successful',
  NoAnswer: 'No Answer',
  WrongNumber: 'Wrong Number',
  CallBackLater: 'Call Back Later',
  NotInterested: 'Not Interested',
  Interested: 'Interested',
} as const;
export type ContactStatus = (typeof ContactStatus)[keyof typeof ContactStatus];

// ── Departments ────────────────────────────────────────────

export const DepartmentJoinRequestStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;
export type DepartmentJoinRequestStatus =
  (typeof DepartmentJoinRequestStatus)[keyof typeof DepartmentJoinRequestStatus];

export const UniformGenderTarget = {
  Male: 'Male',
  Female: 'Female',
  Unisex: 'Unisex',
} as const;
export type UniformGenderTarget = (typeof UniformGenderTarget)[keyof typeof UniformGenderTarget];

// ── Rota ───────────────────────────────────────────────────

export const RotaRecurrence = {
  Weekly: 'Weekly',
} as const;
export type RotaRecurrence = (typeof RotaRecurrence)[keyof typeof RotaRecurrence];

export const RotaInstanceStatus = {
  Draft: 'Draft',
  Published: 'Published',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
} as const;
export type RotaInstanceStatus = (typeof RotaInstanceStatus)[keyof typeof RotaInstanceStatus];

export const RotaAssignmentStatus = {
  Assigned: 'Assigned',
  Confirmed: 'Confirmed',
  Declined: 'Declined',
  Swapped: 'Swapped',
  Open: 'Open',
} as const;
export type RotaAssignmentStatus = (typeof RotaAssignmentStatus)[keyof typeof RotaAssignmentStatus];

export const RotaSwapRequestStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
} as const;
export type RotaSwapRequestStatus =
  (typeof RotaSwapRequestStatus)[keyof typeof RotaSwapRequestStatus];
