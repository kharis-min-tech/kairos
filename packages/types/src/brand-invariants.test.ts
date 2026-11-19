import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BRAND_NAME, BRAND_NAME_PREVIOUS, BRAND_MFA_ISSUER } from './brand';

/**
 * The strings that must keep saying `kairos` after the rebrand, and why.
 *
 * ── What this test is for ─────────────────────────────────────────────────
 *
 * The product was renamed from Kairos to iKharis. The word appears about two
 * thousand times across six hundred files, and almost all of it is display
 * text that should change. Buried in it are roughly twenty strings that are
 * identifiers rather than words, and changing those breaks live systems in
 * ways that are silent, immediate, and in two cases unrecoverable.
 *
 * The risk is not the volume. It is that a load-bearing `kairos` looks exactly
 * like a cosmetic one in a diff, in a search result, and in a find-and-replace
 * preview. A single careless sweep hits every entry below.
 *
 * So each one is pinned here with its consequence. If a future change breaks
 * one, this test fails with the reason attached, and whoever wrote the change
 * has to decide deliberately rather than discover it from a support ticket.
 *
 * ── If you are here because this test failed ──────────────────────────────
 *
 * Do not update the expected string to make it pass. Read the `breaks` note
 * on the failing entry first. Most of these have no migration path: the
 * biometric keys in particular cannot be migrated at all, because reading the
 * old sealed value requires a biometric prompt and the OS will not hand it
 * over to code that has forgotten the key it was stored under.
 *
 * If a rename genuinely has to happen, it needs a migration shipped at least
 * one release BEFORE the rename, and this entry updated in the same change
 * with a note saying what the migration was.
 */

const root = fileURLToPath(new URL('../../../', import.meta.url));

interface Invariant {
  /** Repo-relative path. */
  file: string;
  /** The exact literal that must still be present. */
  literal: string;
  /** What happens to real people if it changes. Shown on failure. */
  breaks: string;
}

const INVARIANTS: Invariant[] = [
  // ── Session storage: renaming signs everyone out ────────────────────────
  {
    file: 'apps/mobile/store/auth.ts',
    literal: "'kairos.access_token'",
    breaks: 'every signed-in mobile user is signed out on next app launch',
  },
  {
    file: 'apps/mobile/store/auth.ts',
    literal: "'kairos.refresh_token'",
    breaks: 'every mobile session is stranded; the stored refresh token becomes unreadable',
  },
  {
    file: 'apps/mobile/store/auth.ts',
    literal: "'kairos.user'",
    breaks: 'the cached profile is orphaned, so the app shows a signed-out shell to a signed-in user',
  },

  // ── Biometric: renaming is UNRECOVERABLE ────────────────────────────────
  //
  // The sealed refresh tokens stay in the OS keychain under the old key names.
  // They cannot be read (the key is gone), cannot be deleted (same reason),
  // and because the armed-users list moves too, the app also forgets anyone
  // was ever armed. Every biometric user loses the feature silently with no
  // cleanup path and no error anyone can act on. This is the single worst
  // thing a rename sweep can do to this codebase.
  {
    file: 'apps/mobile/lib/biometric.ts',
    literal: "'kairos.biometric_armed_users'",
    breaks: 'the app forgets who armed biometric; their sealed tokens are orphaned in the keychain forever',
  },
  {
    file: 'apps/mobile/lib/biometric.ts',
    literal: "'kairos.biometric_refresh_'",
    breaks: 'every sealed refresh token becomes unreadable AND undeletable; biometric sign-in dies with no recovery',
  },
  {
    file: 'apps/mobile/lib/biometric.ts',
    literal: "'kairos.biometric_declined_'",
    breaks: 'everyone who said "Not now" is asked to enable biometric again',
  },
  {
    file: 'apps/mobile/lib/biometric.ts',
    literal: "'kairos.biometric_seal_mfa_'",
    breaks:
      'the seal is read as stale for everyone, so every armed user gets a keychain prompt at their next MFA sign-in',
  },

  // ── Preferences: renaming is merely rude ────────────────────────────────
  {
    file: 'apps/mobile/store/theme.ts',
    literal: "'kairos.theme_mode'",
    breaks: 'every user silently reverts to the default theme',
  },
  {
    file: 'apps/web/src/components/mfa-setup-banner.tsx',
    literal: "'kairos.mfa_nag_dismissed'",
    breaks: 'the second-factor banner reappears for everyone who dismissed it',
  },

  // ── Mid-flight auth: renaming breaks sign-ins already in progress ───────
  {
    file: 'apps/api/src/auth/oauth/state.ts',
    literal: "'kairos.oauth_state'",
    breaks:
      'every social sign-in in flight at deploy time fails CSRF validation, because the cookie was set under the old name',
  },
  {
    file: 'apps/web/src/app/(auth)/oauth-callback/page.tsx',
    literal: "'kairos.oauth_toast'",
    breaks: 'the post-sign-in confirmation toast stops appearing',
  },

  // ── OIDC contract: renaming breaks a third party we do not deploy ───────
  //
  // The analytics platform (Superset dashboards and its AI assistant) signs
  // in through Kairos and reads both of these. Its policy layer keys off them
  // by name. Worse, `oauth_clients.scopes` stores the scope string in the
  // DATABASE, so a rename invalidates every grant already issued and needs a
  // data migration, not just a code change.
  {
    file: 'apps/api/src/oauth-server/scopes.ts',
    literal: "'kairos:grants'",
    breaks:
      'the analytics platform loses all role-based access; stored oauth_clients.scopes rows no longer match any known scope',
  },
  {
    file: 'apps/api/src/oauth-server/service.ts',
    literal: "'kairos_system_role'",
    breaks:
      'church-wide admins stop being recognised by the analytics platform, which falls back to a hand-maintained allowlist',
  },

  // ── App identity: renaming publishes a DIFFERENT APP ────────────────────
  {
    file: 'apps/mobile/app.config.ts',
    literal: "'com.kharis.kairos'",
    breaks:
      'this becomes a new app in both stores: TestFlight testers, installs, reviews and the signing identity are all lost, and users must delete and reinstall',
  },
  {
    file: 'apps/mobile/app.config.ts',
    literal: "scheme: 'kairos'",
    breaks:
      'social sign-in breaks until the redirect URI is updated in every provider console, and installed apps keep answering the old scheme regardless',
  },
  {
    file: 'apps/mobile/app.config.ts',
    literal: "slug: 'kairos-mobile'",
    breaks: 'the EAS project link is severed; builds and over-the-air updates stop working',
  },
  {
    file: 'apps/mobile/app.config.ts',
    literal: "'kairos.kharis.org'",
    breaks:
      'universal links stop resolving for every installed app. If the domain really is moving, the app must claim BOTH hosts for at least one release cycle first',
  },

  // ── Cloudflare and SES: renaming creates new resources ──────────────────
  {
    file: 'apps/api/wrangler.jsonc',
    literal: '"kairos-api"',
    breaks: 'a new empty Worker is deployed and the live one is abandoned, with its routes still pointing at it',
  },
  {
    file: 'apps/api/wrangler.jsonc',
    literal: '"kairos-api-staging"',
    breaks: 'the same, for staging',
  },
  {
    file: 'apps/api/wrangler.jsonc',
    literal: '"kairos-transactional"',
    breaks:
      'email starts sending through a configuration set that does not exist, losing bounce and complaint handling and the suppression list built up so far',
  },
];

describe('rebrand invariants: identifiers that must keep the old name', () => {
  it.each(INVARIANTS.map((inv) => [`${inv.file} :: ${inv.literal}`, inv] as const))(
    '%s',
    (_label, inv) => {
      const content = readFileSync(root + inv.file, 'utf8');
      expect(
        content.includes(inv.literal),
        `${inv.file} no longer contains ${inv.literal}.\n\n` +
          `If this was a rebrand sweep, REVERT IT. Consequence of the change:\n  ${inv.breaks}\n\n` +
          `See packages/types/src/brand.ts for what belongs in the brand constant and what does not.`,
      ).toBe(true);
    },
  );
});

describe('the brand constant', () => {
  it('is the new name, and is not the old one', () => {
    expect(BRAND_NAME).toBe('iKharis');
    expect(BRAND_NAME).not.toContain(BRAND_NAME_PREVIOUS);
  });

  /**
   * The lower-case leading `i` is the name. A sentence-case helper or an
   * over-eager linter capitalising it produces `IKharis`, which is a different
   * word and reads as a typo everywhere it appears.
   */
  it('keeps its lower-case leading letter', () => {
    expect(BRAND_NAME.startsWith('i')).toBe(true);
  });

  /**
   * The authenticator label follows the product name, and the API still
   * defaults to the old one until `MFA_ISSUER` is set. Existing enrolments
   * keep the old label forever, which is cosmetic and must not be repaired by
   * re-enrolling anyone: that issues a new secret and invalidates every unused
   * backup code.
   */
  it('supplies the MFA issuer label', () => {
    expect(BRAND_MFA_ISSUER).toBe(BRAND_NAME);
  });

  it('still knows the previous name, so documents can connect the rename', () => {
    expect(BRAND_NAME_PREVIOUS).toBe('Kairos');
  });
});
