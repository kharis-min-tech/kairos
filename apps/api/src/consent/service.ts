import { and, eq, desc } from 'drizzle-orm';
import type { Database } from '@kairos/database';
import { consentRecords } from '@kairos/database';
import {
  CONSENT_TYPES,
  CONSENT_TYPE_REQUIRED,
  CONSENT_TYPE_REQUIRED_FOR_PRIVILEGED,
  type ConsentType,
  type ConsentStatus,
} from '@kairos/types';

/**
 * Resolve the current version of each consent type from env. Bumping a
 * version triggers the re-prompt banner on next page load — no DB write
 * needed at deploy time.
 */
export function getCurrentConsentVersions(): Record<ConsentType, string> {
  return {
    terms: process.env['CONSENT_VERSION_TERMS'] ?? '2026-07-v1',
    privacy: process.env['CONSENT_VERSION_PRIVACY'] ?? '2026-07-v1',
    marketing: process.env['CONSENT_VERSION_MARKETING'] ?? '1.0',
    acceptable_use: process.env['CONSENT_VERSION_ACCEPTABLE_USE'] ?? '2026-07-v1',
    admin_confidentiality:
      process.env['CONSENT_VERSION_ADMIN_CONFIDENTIALITY'] ?? '2026-07-v1',
  };
}

/**
 * For every consent type, return the user's latest stored record + a
 * `needsAccept` flag based on whether the stored version matches the
 * current env-driven version. Required consents that have never been
 * granted (or were declined) always needAccept.
 *
 * `isPrivileged` toggles the required-map: users with a leadership /
 * administrative role must additionally accept the confidentiality
 * undertaking (`admin_confidentiality`). Defaults to false so ordinary
 * members and legacy callers see the same behavior they did before.
 */
export async function listConsentStatuses(
  db: Database,
  memberId: string,
  isPrivileged = false,
): Promise<ConsentStatus[]> {
  const versions = getCurrentConsentVersions();
  const requiredMap = isPrivileged
    ? CONSENT_TYPE_REQUIRED_FOR_PRIVILEGED
    : CONSENT_TYPE_REQUIRED;
  const rows = await db
    .select({
      consentType: consentRecords.consentType,
      version: consentRecords.version,
      granted: consentRecords.granted,
      grantedAt: consentRecords.grantedAt,
    })
    .from(consentRecords)
    .where(and(eq(consentRecords.memberId, memberId), eq(consentRecords.isActive, true)))
    .orderBy(desc(consentRecords.grantedAt));

  const latestPerType = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestPerType.has(row.consentType)) {
      latestPerType.set(row.consentType, row);
    }
  }

  return CONSENT_TYPES.map((type) => {
    const stored = latestPerType.get(type);
    const required = requiredMap[type];
    const currentVersion = versions[type];
    const acceptedVersion = stored?.version ?? null;
    const granted = stored?.granted ?? null;

    // Required consents block usage until the current version is granted.
    // Optional consents never trigger needsAccept — they live on
    // /profile/settings/legal as a plain opt-in toggle.
    const needsAccept = required
      ? acceptedVersion !== currentVersion || granted !== true
      : false;

    return {
      consentType: type,
      currentVersion,
      acceptedVersion,
      granted,
      grantedAt: stored?.grantedAt.toISOString() ?? null,
      required,
      needsAccept,
    };
  });
}

/**
 * Insert a new consent record for the current env-driven version of the
 * given type. The partial unique index on (member, type, version)
 * guarantees one row per version, so re-recording is idempotent.
 */
export async function recordConsent(
  db: Database,
  memberId: string,
  consentType: ConsentType,
  granted: boolean,
): Promise<ConsentStatus> {
  const versions = getCurrentConsentVersions();
  const version = versions[consentType];

  const [existing] = await db
    .select({ id: consentRecords.id })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.memberId, memberId),
        eq(consentRecords.consentType, consentType),
        eq(consentRecords.version, version),
        eq(consentRecords.isActive, true),
      ),
    )
    .limit(1);

  const now = new Date();
  if (existing) {
    await db
      .update(consentRecords)
      .set({ granted, grantedAt: now })
      .where(eq(consentRecords.id, existing.id));
  } else {
    await db.insert(consentRecords).values({
      memberId,
      consentType,
      version,
      granted,
      grantedAt: now,
    });
  }

  return {
    consentType,
    currentVersion: version,
    acceptedVersion: version,
    granted,
    grantedAt: now.toISOString(),
    required: CONSENT_TYPE_REQUIRED[consentType],
    needsAccept: CONSENT_TYPE_REQUIRED[consentType] ? !granted : false,
  };
}
