/**
 * The product name, in one place.
 *
 * ── Why this file exists ──────────────────────────────────────────────────
 *
 * The system was called Kairos and is called iKharis from the November 2026
 * release to the church. When that rename was scoped, the name turned out to
 * be a bare literal in roughly two thousand places across six hundred files,
 * with no constant anywhere. Every future rename, retitle or white-label
 * would be the same sweep again, and each sweep carries the risk described in
 * `brand-invariants.test.ts`: the handful of load-bearing `kairos` strings
 * look exactly like the two thousand cosmetic ones.
 *
 * So display surfaces read from here. A rename becomes one line plus whatever
 * prose genuinely has to spell the name out.
 *
 * ── What belongs here, and what does not ──────────────────────────────────
 *
 * Here: text shown to a person, where the product is being named.
 *
 * NOT here, and this is the important half:
 *
 *   - Storage keys, cookie names, OAuth scope and claim names, package names,
 *     bundle identifiers, URL schemes, Worker and SES resource names. Those
 *     are identifiers that happen to contain a word. They are pinned by
 *     `brand-invariants.test.ts` and must keep saying `kairos` forever, or
 *     already-issued sessions, sealed biometric tokens, registered relying
 *     parties and installed apps all break at once.
 *   - The charity's legal name. That is `GIFT_AID_CHARITY_NAME` in
 *     `gift-aid.ts` and it is a different fact about a different entity: it
 *     names the registered charity on an HMRC declaration, not the software.
 *     A rebrand of the product must never move it.
 */

/**
 * The product name as a person should ever see it, including the lower-case
 * leading `i`. Do not capitalise it at the start of a sentence: it is a name,
 * and `IKharis` is a different word.
 */
export const BRAND_NAME = 'iKharis';

/**
 * What the system was called before the November 2026 release.
 *
 * Kept as a constant rather than deleted because two kinds of text still need
 * it. Regulatory documents have to connect the rename, so a reader of the
 * DPIA or the privacy notice can tell this is one system with a new name
 * rather than two systems. And anything explaining a stored identifier, an old
 * email or an existing authenticator entry has to be able to say which name it
 * carries and why that is not a defect.
 */
export const BRAND_NAME_PREVIOUS = 'Kairos';

/**
 * The authenticator entry label, as it appears in Google Authenticator and
 * friends.
 *
 * Read by the API from the `MFA_ISSUER` setting, which defaults to the OLD
 * name on purpose, and this constant is the value to set it to. Two things to
 * know before changing it:
 *
 *   - It only affects NEW enrolments. The label is baked into an authenticator
 *     entry when the QR is scanned, so everyone already enrolled keeps seeing
 *     the old name indefinitely.
 *   - That is cosmetic and must not be "fixed" by re-enrolling anybody. Re-
 *     enrolment issues a new secret, which means every member re-scanning a
 *     code and every unused backup code being invalidated, to change a label.
 */
export const BRAND_MFA_ISSUER = BRAND_NAME;
