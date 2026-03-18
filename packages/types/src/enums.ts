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
