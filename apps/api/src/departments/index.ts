// @kairos/api - Department management module exports
// Each handler is a separate Lambda function (granular pattern)

export { handler as departmentsCreateHandler } from './departments-create';
export { handler as departmentsListHandler } from './departments-list';
export { handler as departmentsAssignMemberHandler } from './departments-assign-member';
export { handler as departmentsApproveRequestHandler } from './departments-approve-request';
export { handler as departmentsAddFollowupHandler } from './departments-add-followup';
export { handler as departmentsGetAlertsHandler } from './departments-get-alerts';
