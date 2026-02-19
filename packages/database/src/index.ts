// @kairos/database - Drizzle ORM schemas and client
// Schemas defined matching database/schema.sql

// Core tables: regions, branches, members, branch_leadership
export {
  regions,
  branches,
  members,
  branchLeadership,
} from './schema/core';

// Department tables: departments, branch_departments, department_members
export {
  departments,
  branchDepartments,
  departmentMembers,
} from './schema/departments';

// Fellowship tables: fellowships, fellowship_members, fellowship_meetings, fellowship_meeting_attendance
export {
  fellowships,
  fellowshipMembers,
  fellowshipMeetings,
  fellowshipMeetingAttendance,
} from './schema/fellowships';

// Attendance tables: services, service_attendance
export { services, serviceAttendance } from './schema/attendance';

// Outreach tables: outreach_programs, outreach_participants, souls, follow_ups
export {
  outreachPrograms,
  outreachParticipants,
  souls,
  followUps,
} from './schema/outreach';

// Donation tables: donations
export { donations } from './schema/donations';

// Form tables: forms, form_submissions
export { forms, formSubmissions } from './schema/forms';

// Notification tables: roles, notifications, notification_recipients
export {
  roles,
  notifications,
  notificationRecipients,
} from './schema/notifications';

// WebSocket tables: websocket_connections
export { websocketConnections } from './schema/websocket';

// Relations
export {
  regionsRelations,
  branchesRelations,
  membersRelations,
  branchLeadershipRelations,
  departmentsRelations,
  branchDepartmentsRelations,
  departmentMembersRelations,
  fellowshipsRelations,
  fellowshipMembersRelations,
  fellowshipMeetingsRelations,
  fellowshipMeetingAttendanceRelations,
  servicesRelations,
  serviceAttendanceRelations,
  outreachProgramsRelations,
  outreachParticipantsRelations,
  soulsRelations,
  followUpsRelations,
  donationsRelations,
  formsRelations,
  formSubmissionsRelations,
  rolesRelations,
  notificationsRelations,
  notificationRecipientsRelations,
} from './schema/relations';
