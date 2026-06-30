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
} from './templates/security';

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
};
