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
  Minister: 'Minister',
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

// RBAC Phase 4c: SystemRole collapsed to the break-glass binary. Former
// 'pastor' / 'leader' / 'elder' values are now honorific titles (see
// members.honorific column) plus whatever grants the member explicitly
// holds in member_roles.
export const SystemRole = {
  Admin: 'admin',
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

/**
 * A stage as a person reads it.
 *
 * A stage is a position in a pipeline, not a status: nobody is waiting on
 * "Session 2". Screens render these as plain text. The raw value was being
 * shown on two mobile rosters, so somebody saw the literal string
 * "session-1" beside a member's name.
 */
export const NEW_BELIEVER_STAGE_LABEL: Record<NewBelieverStageValue, string> = {
  enrolled: 'Enrolled',
  'session-1': 'Session 1',
  'session-2': 'Session 2',
  'session-3': 'Session 3',
  'session-4': 'Session 4',
  completed: 'Completed',
  integrated: 'Joined a department',
};
// ── Departments ────────────────────────────────────────────

export const DepartmentJoinRequestStatus = {
  Applied: 'applied',
  InterviewScheduled: 'interview_scheduled',
  Interviewed: 'interviewed',
  Offered: 'offered',
  Probation: 'probation',
  Active: 'active',
  Rejected: 'rejected',
  Withdrawn: 'withdrawn',
  ProbationFailed: 'probation_failed',
} as const;
export type DepartmentJoinRequestStatus =
  (typeof DepartmentJoinRequestStatus)[keyof typeof DepartmentJoinRequestStatus];

export const DepartmentInterviewFormat = {
  InPerson: 'in_person',
  Virtual: 'virtual',
} as const;
export type DepartmentInterviewFormat =
  (typeof DepartmentInterviewFormat)[keyof typeof DepartmentInterviewFormat];

export const DepartmentInterviewOutcome = {
  Pass: 'pass',
  Fail: 'fail',
  Pending: 'pending',
} as const;
export type DepartmentInterviewOutcome =
  (typeof DepartmentInterviewOutcome)[keyof typeof DepartmentInterviewOutcome];

export const DepartmentOfferResponse = {
  Accepted: 'accepted',
  Declined: 'declined',
} as const;
export type DepartmentOfferResponse =
  (typeof DepartmentOfferResponse)[keyof typeof DepartmentOfferResponse];

export const DepartmentProbationOutcome = {
  Passed: 'passed',
  Failed: 'failed',
  Pending: 'pending',
} as const;
export type DepartmentProbationOutcome =
  (typeof DepartmentProbationOutcome)[keyof typeof DepartmentProbationOutcome];

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

// ── Members ────────────────────────────────────────────────

export const MemberType = {
  // 4-week membership class completed. The real Member signal lives in
  // members.membershipClassCompletedAt — `Member` here is the matching
  // provenance/display tag, kept in sync server-side.
  Member: 'member',
  // Attached to the church without (yet) completing the class. Self-signups
  // and soul-capture rows both land here. Replaces the old 'prospect' tag,
  // which read as sales-funnel language for what is actually a faithful
  // regular / department server / inquirer.
  Attendee: 'attendee',
  Visitor: 'visitor',
  Child: 'child',
} as const;
export type MemberType = (typeof MemberType)[keyof typeof MemberType];

// ── Forms & Data Capture ───────────────────────────────────

export const FormType = {
  AltarCall: 'altar_call',
  Baptism: 'baptism',
  Testimony: 'testimony',
  BabyNaming: 'baby_naming',
  BabyDedication: 'baby_dedication',
  FirstTimeVisitor: 'first_time_visitor',
  SignatureRequest: 'signature_request',
  MarriagePack: 'marriage_pack',
  KGroupHost: 'kgroup_host',
} as const;
export type FormType = (typeof FormType)[keyof typeof FormType];

export const FormSubmissionStatus = {
  New: 'new',
  Reviewed: 'reviewed',
  Converted: 'converted',
  Dismissed: 'dismissed',
} as const;
export type FormSubmissionStatus =
  (typeof FormSubmissionStatus)[keyof typeof FormSubmissionStatus];

/**
 * How a submission's status reads to the people who triage them.
 *
 * Members see different words on their own submissions ("Received",
 * "Actioned"), because they are being told what happened to their form, not
 * what job it is. That map stays on the member screen.
 */
export const FORM_SUBMISSION_STATUS_LABEL: Record<FormSubmissionStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  converted: 'Converted',
  dismissed: 'Dismissed',
};

// ── Service Attendance ─────────────────────────────────────

export const ServiceType = {
  Sunday: 'Sunday',
  Midweek: 'Midweek',
  Special: 'Special',
} as const;
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

// Present-only model: a row exists only for attendees, so there is no 'Absent'.
export const ServiceAttendanceStatus = {
  Present: 'Present',
  Late: 'Late',
  Virtual: 'Virtual',
} as const;
export type ServiceAttendanceStatus =
  (typeof ServiceAttendanceStatus)[keyof typeof ServiceAttendanceStatus];

/**
 * Day options for the membership-class preference.
 *
 * Deliberately the whole week rather than the two days the class currently
 * runs: `membership_interest.preferred_class_day` carries no CHECK, so a
 * stream that moves to a Wednesday is a copy change, not a migration.
 */
export const MEMBERSHIP_CLASS_DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
export type MembershipClassDay = (typeof MEMBERSHIP_CLASS_DAYS)[number];
