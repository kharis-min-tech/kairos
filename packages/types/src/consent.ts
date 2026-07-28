/**
 * Consent taxonomy. Tracks per-user acceptance of legal documents:
 *   - terms                  — Terms & Conditions (required for everyone)
 *   - privacy                — Privacy Notice (required for everyone)
 *   - marketing              — Optional marketing comms
 *   - acceptable_use         — Acceptable Use Policy (required for everyone)
 *   - admin_confidentiality  — Confidentiality & Data Handling Undertaking,
 *                              required for anyone with a leadership /
 *                              administrative role (branch admin, branch data
 *                              admin, fellowship leader, department leader).
 *                              Optional for everyone else.
 *
 * Version per type is supplied via env (CONSENT_VERSION_TERMS,
 * CONSENT_VERSION_PRIVACY, CONSENT_VERSION_MARKETING,
 * CONSENT_VERSION_ACCEPTABLE_USE, CONSENT_VERSION_ADMIN_CONFIDENTIALITY) so an
 * admin can bump the prompt by changing a wrangler secret rather than running
 * SQL.
 */

export const ConsentType = {
  Terms: 'terms',
  Privacy: 'privacy',
  Marketing: 'marketing',
  AcceptableUse: 'acceptable_use',
  AdminConfidentiality: 'admin_confidentiality',
} as const;
export type ConsentType = (typeof ConsentType)[keyof typeof ConsentType];

export const CONSENT_TYPES: readonly ConsentType[] = [
  ConsentType.Terms,
  ConsentType.Privacy,
  ConsentType.Marketing,
  ConsentType.AcceptableUse,
  ConsentType.AdminConfidentiality,
];

export const CONSENT_TYPE_LABEL: Record<ConsentType, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Notice',
  marketing: 'Marketing communications',
  acceptable_use: 'Acceptable Use Policy',
  admin_confidentiality: 'Confidentiality & Data Handling Undertaking',
};

export const CONSENT_TYPE_DESCRIPTION: Record<ConsentType, string> = {
  terms: 'The rules and conditions you agree to by using Kharis Church.',
  privacy: 'How Kharis Church handles your personal data.',
  marketing: 'Optional emails about events, news, and updates beyond your active fellowship.',
  acceptable_use:
    'The rules for how you use Kairos day to day, and how you handle information you see about other members.',
  admin_confidentiality:
    'Written undertaking required from anyone granted a leadership or administrative role in Kairos.',
};

/**
 * Whether a consent type is required for an ordinary member (no privileged
 * role). Terms + Privacy + Acceptable Use block the app for everyone.
 * Marketing is always optional. The confidentiality undertaking is not
 * required unless the user holds a covered role — see
 * CONSENT_TYPE_REQUIRED_FOR_PRIVILEGED below.
 */
export const CONSENT_TYPE_REQUIRED: Record<ConsentType, boolean> = {
  terms: true,
  privacy: true,
  marketing: false,
  acceptable_use: true,
  admin_confidentiality: false,
};

/**
 * Whether a consent type is required for a user holding a privileged role
 * (BranchAdmin, BranchDataAdmin, FellowshipLeader/CoLeader,
 * DepartmentLead/Deputy, or systemRole=admin). Same as
 * CONSENT_TYPE_REQUIRED but with the confidentiality undertaking flipped on.
 */
export const CONSENT_TYPE_REQUIRED_FOR_PRIVILEGED: Record<ConsentType, boolean> = {
  terms: true,
  privacy: true,
  marketing: false,
  acceptable_use: true,
  admin_confidentiality: true,
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
