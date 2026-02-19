// @kairos/types - Shared enums for the Kairos platform

/** Branch types supported by the system */
export const BranchType = {
  Main: 'Main',
  Satellite: 'Satellite',
  Cell: 'Cell',
  Campus: 'Campus',
  Online: 'Online',
} as const;
export type BranchType = (typeof BranchType)[keyof typeof BranchType];

/** Gender options */
export const Gender = {
  Male: 'Male',
  Female: 'Female',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

/** Member status */
export const MemberStatus = {
  Pending: 'pending',
  Active: 'active',
  Inactive: 'inactive',
} as const;
export type MemberStatus = (typeof MemberStatus)[keyof typeof MemberStatus];

/** User roles for RBAC */
export const UserRole = {
  Admin: 'Admin',
  Pastor: 'Pastor',
  Leader: 'Leader',
  Member: 'Member',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Branch leadership roles */
export const LeadershipRole = {
  MainPastor: 'Main Pastor',
  Elder: 'Elder',
} as const;
export type LeadershipRole = (typeof LeadershipRole)[keyof typeof LeadershipRole];

/** Fellowship types */
export const FellowshipType = {
  KGroups: 'K-Groups',
  KharisExpress: 'Kharis Express',
  NewBreeds: 'New Breeds',
  KharisOnCampus: 'Kharis on Campus',
  KharisOnCampusColleges: 'Kharis on Campus Colleges',
} as const;
export type FellowshipType = (typeof FellowshipType)[keyof typeof FellowshipType];

/** Service types */
export const ServiceType = {
  SundayService: 'Sunday Service',
  MidweekService: 'Midweek Service',
  SpecialService: 'Special Service',
} as const;
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

/** Service attendance status */
export const ServiceAttendanceStatus = {
  Present: 'Present',
  Absent: 'Absent',
  Virtual: 'Virtual',
} as const;
export type ServiceAttendanceStatus = (typeof ServiceAttendanceStatus)[keyof typeof ServiceAttendanceStatus];

/** Fellowship attendance status */
export const FellowshipAttendanceStatus = {
  Present: 'Present',
  Absent: 'Absent',
  Excused: 'Excused',
  Late: 'Late',
} as const;
export type FellowshipAttendanceStatus = (typeof FellowshipAttendanceStatus)[keyof typeof FellowshipAttendanceStatus];

/** Soul status pipeline */
export const SoulStatus = {
  New: 'New',
  FollowingUp: 'Following Up',
  Interested: 'Interested',
  Converted: 'Converted',
  NotInterested: 'Not Interested',
} as const;
export type SoulStatus = (typeof SoulStatus)[keyof typeof SoulStatus];

/** Follow-up contact methods */
export const ContactMethod = {
  PhoneCall: 'Phone Call',
  HomeVisit: 'Home Visit',
  TextMessage: 'Text Message',
  Email: 'Email',
  InPersonMeeting: 'In-Person Meeting',
} as const;
export type ContactMethod = (typeof ContactMethod)[keyof typeof ContactMethod];

/** Follow-up contact status */
export const ContactStatus = {
  Successful: 'Successful',
  NoAnswer: 'No Answer',
  CallBackLater: 'Call Back Later',
  NotInterested: 'Not Interested',
} as const;
export type ContactStatus = (typeof ContactStatus)[keyof typeof ContactStatus];

/** Donation purpose */
export const DonationPurpose = {
  Offering: 'Offering',
  Tithe: 'Tithe',
  BuildingFund: 'Building Fund',
  Other: 'Other',
} as const;
export type DonationPurpose = (typeof DonationPurpose)[keyof typeof DonationPurpose];

/** Payment methods */
export const PaymentMethod = {
  Cash: 'Cash',
  Check: 'Check',
  BankTransfer: 'Bank Transfer',
  MobileMoney: 'Mobile Money',
  Card: 'Card',
  Online: 'Online',
  Other: 'Other',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

/** Form scope */
export const FormScope = {
  ChurchWide: 'Church-wide',
  BranchSpecific: 'Branch-specific',
} as const;
export type FormScope = (typeof FormScope)[keyof typeof FormScope];

/** Form field types */
export const FormFieldType = {
  Text: 'Text',
  Email: 'Email',
  Phone: 'Phone',
  Number: 'Number',
  Date: 'Date',
  Dropdown: 'Dropdown',
  Checkbox: 'Checkbox',
  Radio: 'Radio',
  Textarea: 'Textarea',
} as const;
export type FormFieldType = (typeof FormFieldType)[keyof typeof FormFieldType];

/** Notification types */
export const NotificationType = {
  Announcement: 'Announcement',
  Reminder: 'Reminder',
  Alert: 'Alert',
  Event: 'Event',
  General: 'General',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/** Notification priority */
export const NotificationPriority = {
  Low: 'Low',
  Normal: 'Normal',
  High: 'High',
  Urgent: 'Urgent',
} as const;
export type NotificationPriority = (typeof NotificationPriority)[keyof typeof NotificationPriority];

/** Notification target scope */
export const TargetScope = {
  All: 'All',
  Branch: 'Branch',
  Region: 'Region',
  Department: 'Department',
  Fellowship: 'Fellowship',
  Role: 'Role',
  Leadership: 'Leadership',
} as const;
export type TargetScope = (typeof TargetScope)[keyof typeof TargetScope];
