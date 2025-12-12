// Enum definitions for the Kairos Church Management System

export enum UserType {
  Admin = 'Admin',
  Pastor = 'Pastor',
  Member = 'Member',
  Staff = 'Staff',
  Volunteer = 'Volunteer',
}

export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other',
  PreferNotToSay = 'PreferNotToSay',
}

export enum MaritalStatus {
  Single = 'Single',
  Married = 'Married',
  Divorced = 'Divorced',
  Widowed = 'Widowed',
  Separated = 'Separated',
}

export enum SoulStatus {
  NewContact = 'NewContact',
  FirstTimer = 'FirstTimer',
  SecondTimer = 'SecondTimer',
  Regular = 'Regular',
  Member = 'Member',
  Inactive = 'Inactive',
  Transferred = 'Transferred',
}

export enum FollowUpType {
  PhoneCall = 'PhoneCall',
  HomeVisit = 'HomeVisit',
  Email = 'Email',
  SMS = 'SMS',
  InPerson = 'InPerson',
  WhatsApp = 'WhatsApp',
}

export enum EventType {
  Service = 'Service',
  Conference = 'Conference',
  Workshop = 'Workshop',
  Retreat = 'Retreat',
  Outreach = 'Outreach',
  Fellowship = 'Fellowship',
  Training = 'Training',
  Meeting = 'Meeting',
  Social = 'Social',
  Other = 'Other',
}

export enum PaymentType {
  Tithe = 'Tithe',
  Offering = 'Offering',
  Pledge = 'Pledge',
  Donation = 'Donation',
  EventFee = 'EventFee',
  Membership = 'Membership',
  Other = 'Other',
}

export enum PaymentMethod {
  Cash = 'Cash',
  Check = 'Check',
  CreditCard = 'CreditCard',
  DebitCard = 'DebitCard',
  BankTransfer = 'BankTransfer',
  MobileMoney = 'MobileMoney',
  Online = 'Online',
  Other = 'Other',
}

export enum PaymentStatus {
  Pending = 'Pending',
  Completed = 'Completed',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
  Refunded = 'Refunded',
  PartiallyRefunded = 'PartiallyRefunded',
}

export enum RecurringFrequency {
  Weekly = 'Weekly',
  BiWeekly = 'BiWeekly',
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  SemiAnnually = 'SemiAnnually',
  Annually = 'Annually',
}

export enum PledgeType {
  Building = 'Building',
  Missions = 'Missions',
  Special = 'Special',
  General = 'General',
  Other = 'Other',
}

export enum PledgeStatus {
  Active = 'Active',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Suspended = 'Suspended',
}

export enum FormFieldType {
  Text = 'Text',
  TextArea = 'TextArea',
  Email = 'Email',
  Phone = 'Phone',
  Number = 'Number',
  Date = 'Date',
  DateTime = 'DateTime',
  Select = 'Select',
  MultiSelect = 'MultiSelect',
  Radio = 'Radio',
  Checkbox = 'Checkbox',
  File = 'File',
  Boolean = 'Boolean',
}

export enum AnnouncementPriority {
  Low = 'Low',
  Normal = 'Normal',
  High = 'High',
  Urgent = 'Urgent',
}

export enum NotificationType {
  Info = 'Info',
  Warning = 'Warning',
  Error = 'Error',
  Success = 'Success',
  Reminder = 'Reminder',
  Announcement = 'Announcement',
}

export enum MessageType {
  Text = 'Text',
  Image = 'Image',
  File = 'File',
  Audio = 'Audio',
  Video = 'Video',
  Link = 'Link',
}

export enum AccessAction {
  Login = 'Login',
  Logout = 'Logout',
  Create = 'Create',
  Read = 'Read',
  Update = 'Update',
  Delete = 'Delete',
  Export = 'Export',
  Import = 'Import',
  Print = 'Print',
}
