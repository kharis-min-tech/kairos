/**
 * Consent taxonomy. Phase 3 tracks three independent acceptances:
 *   - terms    — Terms & Conditions
 *   - privacy  — Privacy Notice
 *   - marketing — Optional marketing comms
 *
 * Version per type is supplied via env (CONSENT_VERSION_TERMS,
 * CONSENT_VERSION_PRIVACY, CONSENT_VERSION_MARKETING) so an admin can bump
 * the prompt by changing a wrangler secret rather than running SQL.
 */

export const ConsentType = {
  Terms: 'terms',
  Privacy: 'privacy',
  Marketing: 'marketing',
} as const;
export type ConsentType = (typeof ConsentType)[keyof typeof ConsentType];

export const CONSENT_TYPES: readonly ConsentType[] = [
  ConsentType.Terms,
  ConsentType.Privacy,
  ConsentType.Marketing,
];

export const CONSENT_TYPE_LABEL: Record<ConsentType, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Notice',
  marketing: 'Marketing communications',
};

export const CONSENT_TYPE_DESCRIPTION: Record<ConsentType, string> = {
  terms: 'The rules and conditions you agree to by using Kharis Church.',
  privacy: 'How Kharis Church handles your personal data.',
  marketing: 'Optional emails about events, news, and updates beyond your active fellowship.',
};

/**
 * Whether a consent type is required to use the app. Terms + Privacy are
 * required (block the app until accepted); Marketing is optional.
 */
export const CONSENT_TYPE_REQUIRED: Record<ConsentType, boolean> = {
  terms: true,
  privacy: true,
  marketing: false,
};

export interface ConsentStatus {
  consentType: ConsentType;
  currentVersion: string;
  acceptedVersion: string | null;
  granted: boolean | null;
  grantedAt: string | null;
  required: boolean;
  needsAccept: boolean;
}

export interface ListMyConsentResponse {
  statuses: ConsentStatus[];
}

export interface RecordConsentRequest {
  consentType: ConsentType;
  granted: boolean;
}
