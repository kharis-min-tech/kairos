/**
 * Registry mapping NotificationEventType → renderer + category + digest line.
 *
 * The dispatcher in ./service.ts uses `render` for immediate sends; the daily
 * digest cron in ./digest.ts uses `digestLine` to compose bullet summaries.
 * Both must agree on the payload shape — `digestLine` should pull only fields
 * the dispatcher has already validated via `render`.
 */

import { NotificationCategory, NotificationEventType } from '@kairos/types';
import {
  renderPasswordResetRequested,
  renderPasswordChanged,
  renderRoleGranted,
  renderRoleRevoked,
  renderSigninNewDevice,
  digestPasswordResetRequested,
  digestPasswordChanged,
  digestRoleGranted,
  digestRoleRevoked,
  digestSigninNewDevice,
} from './templates/security';
import {
  renderJoinRequestReceived,
  renderJoinRequestDecided,
  renderSoulAssigned,
  renderSoulStatusChanged,
  renderNewBelieverStageMoved,
  renderNewBelieverRemoved,
  digestJoinRequestReceived,
  digestJoinRequestDecided,
  digestSoulAssigned,
  digestSoulStatusChanged,
  digestNewBelieverStageMoved,
  digestNewBelieverRemoved,
} from './templates/workflow';
import {
  renderVisitorPromoted,
  renderChildAgedOut,
  renderMemberConfirmed,
  digestVisitorPromoted,
  digestChildAgedOut,
  digestMemberConfirmed,
} from './templates/lifecycle';
import {
  renderFormsSubmissionReceived,
  digestFormsSubmissionReceived,
} from './templates/forms';
import {
  renderRotaAssignmentConfirmed,
  renderRotaSwapRequested,
  renderUniformScheduleSet,
  digestRotaAssignmentConfirmed,
  digestRotaSwapRequested,
  digestUniformScheduleSet,
} from './templates/rota';

export interface RenderedEmail {
  subject: string;
  html: string;
}

export interface TemplateEntry {
  category: NotificationCategory;
  render: (payload: any) => RenderedEmail;
  digestLine: (payload: any) => string;
}

export const TEMPLATE_REGISTRY: Record<string, TemplateEntry> = {
  [NotificationEventType.SecurityPasswordResetRequested]: {
    category: NotificationCategory.Security,
    render: renderPasswordResetRequested,
    digestLine: digestPasswordResetRequested,
  },
  [NotificationEventType.SecurityPasswordChanged]: {
    category: NotificationCategory.Security,
    render: renderPasswordChanged,
    digestLine: digestPasswordChanged,
  },
  [NotificationEventType.SecurityRoleGranted]: {
    category: NotificationCategory.Security,
    render: renderRoleGranted,
    digestLine: digestRoleGranted,
  },
  [NotificationEventType.SecurityRoleRevoked]: {
    category: NotificationCategory.Security,
    render: renderRoleRevoked,
    digestLine: digestRoleRevoked,
  },
  [NotificationEventType.SecuritySigninNewDevice]: {
    category: NotificationCategory.Security,
    render: renderSigninNewDevice,
    digestLine: digestSigninNewDevice,
  },
  [NotificationEventType.WorkflowFellowshipJoinRequestReceived]: {
    category: NotificationCategory.Workflow,
    render: renderJoinRequestReceived,
    digestLine: digestJoinRequestReceived,
  },
  [NotificationEventType.WorkflowFellowshipJoinRequestDecided]: {
    category: NotificationCategory.Workflow,
    render: renderJoinRequestDecided,
    digestLine: digestJoinRequestDecided,
  },
  [NotificationEventType.WorkflowDepartmentJoinRequestReceived]: {
    category: NotificationCategory.Workflow,
    render: renderJoinRequestReceived,
    digestLine: digestJoinRequestReceived,
  },
  [NotificationEventType.WorkflowDepartmentJoinRequestDecided]: {
    category: NotificationCategory.Workflow,
    render: renderJoinRequestDecided,
    digestLine: digestJoinRequestDecided,
  },
  [NotificationEventType.WorkflowSoulAssigned]: {
    category: NotificationCategory.Workflow,
    render: renderSoulAssigned,
    digestLine: digestSoulAssigned,
  },
  [NotificationEventType.WorkflowSoulStatusChanged]: {
    category: NotificationCategory.Workflow,
    render: renderSoulStatusChanged,
    digestLine: digestSoulStatusChanged,
  },
  [NotificationEventType.WorkflowNewBelieverStageMoved]: {
    category: NotificationCategory.Workflow,
    render: renderNewBelieverStageMoved,
    digestLine: digestNewBelieverStageMoved,
  },
  [NotificationEventType.WorkflowNewBelieverRemoved]: {
    category: NotificationCategory.Workflow,
    render: renderNewBelieverRemoved,
    digestLine: digestNewBelieverRemoved,
  },
  [NotificationEventType.LifecycleVisitorPromoted]: {
    category: NotificationCategory.Lifecycle,
    render: renderVisitorPromoted,
    digestLine: digestVisitorPromoted,
  },
  [NotificationEventType.LifecycleChildAgedOut]: {
    category: NotificationCategory.Lifecycle,
    render: renderChildAgedOut,
    digestLine: digestChildAgedOut,
  },
  [NotificationEventType.LifecycleMemberConfirmed]: {
    category: NotificationCategory.Lifecycle,
    render: renderMemberConfirmed,
    digestLine: digestMemberConfirmed,
  },
  [NotificationEventType.FormsSubmissionReceived]: {
    category: NotificationCategory.Forms,
    render: renderFormsSubmissionReceived,
    digestLine: digestFormsSubmissionReceived,
  },
  [NotificationEventType.RotaAssignmentConfirmed]: {
    category: NotificationCategory.Rota,
    render: renderRotaAssignmentConfirmed,
    digestLine: digestRotaAssignmentConfirmed,
  },
  [NotificationEventType.RotaSwapRequested]: {
    category: NotificationCategory.Rota,
    render: renderRotaSwapRequested,
    digestLine: digestRotaSwapRequested,
  },
  [NotificationEventType.UniformScheduleSet]: {
    category: NotificationCategory.Uniform,
    render: renderUniformScheduleSet,
    digestLine: digestUniformScheduleSet,
  },
};
