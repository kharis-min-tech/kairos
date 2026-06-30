/**
 * Registry mapping NotificationEventType → renderer + category.
 *
 * The dispatcher in ./service.ts uses this to know which renderer to call
 * and which category to gate against the recipient's preferences. New event
 * types must be added here AND in @kairos/types/notifications.
 */

import { NotificationCategory, NotificationEventType } from '@kairos/types';
import {
  renderPasswordResetRequested,
  renderPasswordChanged,
  renderRoleGranted,
  renderRoleRevoked,
  renderSigninNewDevice,
} from './templates/security';
import {
  renderJoinRequestReceived,
  renderJoinRequestDecided,
  renderSoulAssigned,
  renderSoulStatusChanged,
  renderNewBelieverStageMoved,
} from './templates/workflow';

export interface RenderedEmail {
  subject: string;
  html: string;
}

export interface TemplateEntry {
  category: NotificationCategory;
  render: (payload: any) => RenderedEmail;
}

export const TEMPLATE_REGISTRY: Record<string, TemplateEntry> = {
  [NotificationEventType.SecurityPasswordResetRequested]: {
    category: NotificationCategory.Security,
    render: renderPasswordResetRequested,
  },
  [NotificationEventType.SecurityPasswordChanged]: {
    category: NotificationCategory.Security,
    render: renderPasswordChanged,
  },
  [NotificationEventType.SecurityRoleGranted]: {
    category: NotificationCategory.Security,
    render: renderRoleGranted,
  },
  [NotificationEventType.SecurityRoleRevoked]: {
    category: NotificationCategory.Security,
    render: renderRoleRevoked,
  },
  [NotificationEventType.SecuritySigninNewDevice]: {
    category: NotificationCategory.Security,
    render: renderSigninNewDevice,
  },
  [NotificationEventType.WorkflowFellowshipJoinRequestReceived]: {
    category: NotificationCategory.Workflow,
    render: renderJoinRequestReceived,
  },
  [NotificationEventType.WorkflowFellowshipJoinRequestDecided]: {
    category: NotificationCategory.Workflow,
    render: renderJoinRequestDecided,
  },
  [NotificationEventType.WorkflowDepartmentJoinRequestReceived]: {
    category: NotificationCategory.Workflow,
    render: renderJoinRequestReceived,
  },
  [NotificationEventType.WorkflowDepartmentJoinRequestDecided]: {
    category: NotificationCategory.Workflow,
    render: renderJoinRequestDecided,
  },
  [NotificationEventType.WorkflowSoulAssigned]: {
    category: NotificationCategory.Workflow,
    render: renderSoulAssigned,
  },
  [NotificationEventType.WorkflowSoulStatusChanged]: {
    category: NotificationCategory.Workflow,
    render: renderSoulStatusChanged,
  },
  [NotificationEventType.WorkflowNewBelieverStageMoved]: {
    category: NotificationCategory.Workflow,
    render: renderNewBelieverStageMoved,
  },
};
