import { describe, expect, it } from 'vitest';

import { docsUrl } from './docs-url';

describe('docsUrl', () => {
  it('leaves English at the root, so links already shared keep working', () => {
    expect(docsUrl('', 'en')).toBe('https://docs.kairos.kharis.org/');
    expect(docsUrl('platform/members', 'en')).toBe(
      'https://docs.kairos.kharis.org/platform/members',
    );
  });

  it('sends a reader to the handbook in their own language', () => {
    expect(docsUrl('', 'fr')).toBe('https://docs.kairos.kharis.org/fr/');
    expect(docsUrl('platform/members', 'kri')).toBe(
      'https://docs.kairos.kharis.org/kri/platform/members',
    );
    expect(docsUrl('getting-started/video-tour', 'tw')).toBe(
      'https://docs.kairos.kharis.org/tw/getting-started/video-tour',
    );
  });

  it('accepts a full tag, because i18n.language can be fr-FR', () => {
    expect(docsUrl('platform/members', 'fr-FR')).toBe(
      'https://docs.kairos.kharis.org/fr/platform/members',
    );
  });

  it('does not care whether the path has a leading slash', () => {
    expect(docsUrl('/platform/members', 'fr')).toBe(docsUrl('platform/members', 'fr'));
  });

  it('falls back to English for a language the handbook is not published in', () => {
    expect(docsUrl('platform/members', 'es')).toBe(
      'https://docs.kairos.kharis.org/platform/members',
    );
  });
});
