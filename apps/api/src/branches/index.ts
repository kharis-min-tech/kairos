// @kairos/api - Branch management Lambda handlers
// Each handler is a separate Lambda function (granular pattern)

export { handler as branchesCreate } from './branches-create';
export { handler as branchesList } from './branches-list';
export { handler as branchesGet } from './branches-get';
export { handler as branchesUpdate } from './branches-update';
export { handler as branchesAssignPastor } from './branches-assign-pastor';
export { handler as branchesAssignElder } from './branches-assign-elder';
export { handler as branchesDelete } from './branches-delete';
