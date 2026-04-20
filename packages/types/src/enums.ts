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

// ── New Believers ────────────────────────────────────────
export const NewBelieverStage = {
  Enrolled: 'enrolled',
  Session1: 'session-1',
  Session2: 'session-2',
  Session3: 'session-3',
  Session4: 'session-4',
  Completed: 'completed',
  Integrated: 'integrated',
} as const;
export type NewBelieverStageValue = (typeof NewBelieverStage)[keyof typeof NewBelieverStage];
export const NEW_BELIEVER_STAGES = Object.values(NewBelieverStage) as NewBelieverStageValue[];
