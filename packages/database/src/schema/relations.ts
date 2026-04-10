import { relations } from 'drizzle-orm';
import { regions, branches, members, branchLeadership } from './core';
import { departments, branchDepartments, departmentMembers } from './departments';
import {
  fellowships,
  fellowshipMembers,
  fellowshipMeetings,
  fellowshipMeetingAttendance,
} from './fellowships';
import { services, serviceAttendance } from './attendance';
import {
  outreachPrograms,
  outreachParticipants,
  souls,
  followUps,
} from './outreach';
import { donations } from './donations';
import { forms, formSubmissions } from './forms';
import {
  roles,
  notifications,
  notificationRecipients,
} from './notifications';

// ============================================================================
// REGION RELATIONS
// ============================================================================
export const regionsRelations = relations(regions, ({ many }) => ({
  branches: many(branches),
}));

// ============================================================================
// BRANCH RELATIONS
// ============================================================================
export const branchesRelations = relations(branches, ({ one, many }) => ({
  region: one(regions, {
    fields: [branches.regionId],
    references: [regions.regionId],
  }),
  members: many(members),
  leadership: many(branchLeadership),
  branchDepartments: many(branchDepartments),
  fellowships: many(fellowships),
  services: many(services),
  outreachPrograms: many(outreachPrograms),
  donations: many(donations),
}));

// ============================================================================
// MEMBER RELATIONS
// ============================================================================
export const membersRelations = relations(members, ({ one, many }) => ({
  homeBranch: one(branches, {
    fields: [members.homeBranchId],
    references: [branches.branchId],
  }),
  leadershipRoles: many(branchLeadership),
  departmentMemberships: many(departmentMembers),
  fellowshipMemberships: many(fellowshipMembers),
  donations: many(donations),
}));

// ============================================================================
// BRANCH LEADERSHIP RELATIONS
// ============================================================================
export const branchLeadershipRelations = relations(branchLeadership, ({ one }) => ({
  branch: one(branches, {
    fields: [branchLeadership.branchId],
    references: [branches.branchId],
  }),
  member: one(members, {
    fields: [branchLeadership.memberId],
    references: [members.memberId],
  }),
}));

// ============================================================================
// DEPARTMENT RELATIONS
// ============================================================================
export const departmentsRelations = relations(departments, ({ many }) => ({
  branchDepartments: many(branchDepartments),
}));

export const branchDepartmentsRelations = relations(branchDepartments, ({ one, many }) => ({
  branch: one(branches, {
    fields: [branchDepartments.branchId],
    references: [branches.branchId],
  }),
  department: one(departments, {
    fields: [branchDepartments.departmentId],
    references: [departments.departmentId],
  }),
  lead: one(members, {
    fields: [branchDepartments.leadMemberId],
    references: [members.memberId],
    relationName: 'departmentLead',
  }),
  deputy: one(members, {
    fields: [branchDepartments.deputyMemberId],
    references: [members.memberId],
    relationName: 'departmentDeputy',
  }),
  members: many(departmentMembers),
}));

export const departmentMembersRelations = relations(departmentMembers, ({ one }) => ({
  branchDepartment: one(branchDepartments, {
    fields: [departmentMembers.branchDepartmentId],
    references: [branchDepartments.branchDepartmentId],
  }),
  member: one(members, {
    fields: [departmentMembers.memberId],
    references: [members.memberId],
  }),
}));

// ============================================================================
// FELLOWSHIP RELATIONS
// ============================================================================
export const fellowshipsRelations = relations(fellowships, ({ one, many }) => ({
  branch: one(branches, {
    fields: [fellowships.branchId],
    references: [branches.branchId],
  }),
  leader: one(members, {
    fields: [fellowships.leaderId],
    references: [members.memberId],
    relationName: 'fellowshipLeader',
  }),
  coLeader: one(members, {
    fields: [fellowships.coLeaderId],
    references: [members.memberId],
    relationName: 'fellowshipCoLeader',
  }),
  members: many(fellowshipMembers),
  meetings: many(fellowshipMeetings),
}));

export const fellowshipMembersRelations = relations(fellowshipMembers, ({ one }) => ({
  fellowship: one(fellowships, {
    fields: [fellowshipMembers.fellowshipId],
    references: [fellowships.fellowshipId],
  }),
  member: one(members, {
    fields: [fellowshipMembers.memberId],
    references: [members.memberId],
  }),
}));

export const fellowshipMeetingsRelations = relations(fellowshipMeetings, ({ one, many }) => ({
  fellowship: one(fellowships, {
    fields: [fellowshipMeetings.fellowshipId],
    references: [fellowships.fellowshipId],
  }),
  creator: one(members, {
    fields: [fellowshipMeetings.createdBy],
    references: [members.memberId],
  }),
  attendance: many(fellowshipMeetingAttendance),
}));

export const fellowshipMeetingAttendanceRelations = relations(
  fellowshipMeetingAttendance,
  ({ one }) => ({
    meeting: one(fellowshipMeetings, {
      fields: [fellowshipMeetingAttendance.meetingId],
      references: [fellowshipMeetings.meetingId],
    }),
    member: one(members, {
      fields: [fellowshipMeetingAttendance.memberId],
      references: [members.memberId],
    }),
    recorder: one(members, {
      fields: [fellowshipMeetingAttendance.recordedBy],
      references: [members.memberId],
      relationName: 'attendanceRecorder',
    }),
  })
);

// ============================================================================
// SERVICE RELATIONS
// ============================================================================
export const servicesRelations = relations(services, ({ one, many }) => ({
  branch: one(branches, {
    fields: [services.branchId],
    references: [branches.branchId],
  }),
  preacher: one(members, {
    fields: [services.preacherId],
    references: [members.memberId],
  }),
  attendance: many(serviceAttendance),
}));

export const serviceAttendanceRelations = relations(serviceAttendance, ({ one }) => ({
  service: one(services, {
    fields: [serviceAttendance.serviceId],
    references: [services.serviceId],
  }),
  member: one(members, {
    fields: [serviceAttendance.memberId],
    references: [members.memberId],
  }),
  recorder: one(members, {
    fields: [serviceAttendance.recordedBy],
    references: [members.memberId],
    relationName: 'serviceAttendanceRecorder',
  }),
}));

// ============================================================================
// OUTREACH RELATIONS
// ============================================================================
export const outreachProgramsRelations = relations(outreachPrograms, ({ one, many }) => ({
  branch: one(branches, {
    fields: [outreachPrograms.branchId],
    references: [branches.branchId],
  }),
  coordinator: one(members, {
    fields: [outreachPrograms.coordinatorId],
    references: [members.memberId],
  }),
  participants: many(outreachParticipants),
  souls: many(souls),
}));

export const outreachParticipantsRelations = relations(outreachParticipants, ({ one }) => ({
  outreach: one(outreachPrograms, {
    fields: [outreachParticipants.outreachId],
    references: [outreachPrograms.outreachId],
  }),
  member: one(members, {
    fields: [outreachParticipants.memberId],
    references: [members.memberId],
  }),
}));

export const soulsRelations = relations(souls, ({ one, many }) => ({
  outreach: one(outreachPrograms, {
    fields: [souls.outreachId],
    references: [outreachPrograms.outreachId],
  }),
  assignedMember: one(members, {
    fields: [souls.assignedMemberId],
    references: [members.memberId],
    relationName: 'assignedSouls',
  }),
  convertedToMember: one(members, {
    fields: [souls.convertedToMemberId],
    references: [members.memberId],
    relationName: 'convertedSouls',
  }),
  followUps: many(followUps),
}));

export const followUpsRelations = relations(followUps, ({ one }) => ({
  soul: one(souls, {
    fields: [followUps.soulId],
    references: [souls.soulId],
  }),
  member: one(members, {
    fields: [followUps.memberId],
    references: [members.memberId],
  }),
}));

// ============================================================================
// DONATION RELATIONS
// ============================================================================
export const donationsRelations = relations(donations, ({ one }) => ({
  member: one(members, {
    fields: [donations.memberId],
    references: [members.memberId],
  }),
  branch: one(branches, {
    fields: [donations.branchId],
    references: [branches.branchId],
  }),
  recorder: one(members, {
    fields: [donations.recordedBy],
    references: [members.memberId],
    relationName: 'donationRecorder',
  }),
}));

// ============================================================================
// FORM RELATIONS
// ============================================================================
export const formsRelations = relations(forms, ({ one, many }) => ({
  targetBranch: one(branches, {
    fields: [forms.targetBranchId],
    references: [branches.branchId],
  }),
  creator: one(members, {
    fields: [forms.createdBy],
    references: [members.memberId],
  }),
  submissions: many(formSubmissions),
}));

export const formSubmissionsRelations = relations(formSubmissions, ({ one }) => ({
  form: one(forms, {
    fields: [formSubmissions.formId],
    references: [forms.formId],
  }),
  member: one(members, {
    fields: [formSubmissions.memberId],
    references: [members.memberId],
  }),
}));

// ============================================================================
// ROLE RELATIONS
// ============================================================================
export const rolesRelations = relations(roles, ({ many }) => ({
  notifications: many(notifications),
}));

// ============================================================================
// NOTIFICATION RELATIONS
// ============================================================================
export const notificationsRelations = relations(notifications, ({ one, many }) => ({
  sender: one(members, {
    fields: [notifications.sentBy],
    references: [members.memberId],
  }),
  targetBranch: one(branches, {
    fields: [notifications.targetBranchId],
    references: [branches.branchId],
  }),
  targetRegion: one(regions, {
    fields: [notifications.targetRegionId],
    references: [regions.regionId],
  }),
  targetDepartment: one(departments, {
    fields: [notifications.targetDepartmentId],
    references: [departments.departmentId],
  }),
  targetFellowship: one(fellowships, {
    fields: [notifications.targetFellowshipId],
    references: [fellowships.fellowshipId],
  }),
  targetRole: one(roles, {
    fields: [notifications.targetRoleId],
    references: [roles.roleId],
  }),
  recipients: many(notificationRecipients),
}));

export const notificationRecipientsRelations = relations(
  notificationRecipients,
  ({ one }) => ({
    notification: one(notifications, {
      fields: [notificationRecipients.notificationId],
      references: [notifications.notificationId],
    }),
    member: one(members, {
      fields: [notificationRecipients.memberId],
      references: [members.memberId],
    }),
  })
);
