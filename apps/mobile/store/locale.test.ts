import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocaleStore } from './locale';
import i18n from '@/lib/i18n';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageTag: 'en-GB', languageCode: 'en' }]),
}));

const { getLocales } = jest.requireMock('expo-localization') as {
  getLocales: jest.Mock;
};

const reset = () => {
  useLocaleStore.setState({ hydrated: false, preference: 'system' });
  getLocales.mockReturnValue([{ languageTag: 'en-GB', languageCode: 'en' }]);
};

beforeEach(async () => {
  reset();
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('locale store', () => {
  it('defaults to following the device when nothing is stored', async () => {
    getLocales.mockReturnValue([{ languageTag: 'fr-FR', languageCode: 'fr' }]);
    await useLocaleStore.getState().hydrate();

    expect(useLocaleStore.getState().preference).toBe('system');
    expect(useLocaleStore.getState().hydrated).toBe(true);
    expect(i18n.language).toBe('fr');
  });

  it('restores a stored preference over the device language', async () => {
    getLocales.mockReturnValue([{ languageTag: 'fr-FR', languageCode: 'fr' }]);
    await AsyncStorage.setItem('kairos.language', 'en');

    await useLocaleStore.getState().hydrate();

    expect(useLocaleStore.getState().preference).toBe('en');
    expect(i18n.language).toBe('en');
  });

  it('ignores a stored value that is not a language we ship', async () => {
    await AsyncStorage.setItem('kairos.language', 'klingon');
    await useLocaleStore.getState().hydrate();

    expect(useLocaleStore.getState().preference).toBe('system');
  });

  it('persists a chosen language and applies it immediately', async () => {
    await useLocaleStore.getState().setPreference('fr');

    expect(useLocaleStore.getState().preference).toBe('fr');
    expect(i18n.language).toBe('fr');
    expect(await AsyncStorage.getItem('kairos.language')).toBe('fr');
  });

  it('falls back to English for a device language we do not ship', async () => {
    getLocales.mockReturnValue([{ languageTag: 'de-DE', languageCode: 'de' }]);
    await useLocaleStore.getState().hydrate();

    expect(i18n.language).toBe('en');
  });

  it('matches a regional tag to its base language', async () => {
    getLocales.mockReturnValue([{ languageTag: 'fr-CA', languageCode: 'fr' }]);
    await useLocaleStore.getState().hydrate();

    expect(i18n.language).toBe('fr');
  });

  it('translates into Krio', async () => {
    await useLocaleStore.getState().setPreference('kri');

    expect(i18n.language).toBe('kri');
    expect(i18n.t('more:rows.language')).toBe('Langwej');
  });

  it('translates into Twi, including its ɔ and ɛ characters', async () => {
    await useLocaleStore.getState().setPreference('tw');

    expect(i18n.language).toBe('tw');
    expect(i18n.t('common:tabs.more')).toBe('Pii');
    // The glyphs the card flagged as a font risk must survive the round trip.
    expect(i18n.t('more:rows.appearance')).toContain('ɛ');
  });

  it('falls back to English for a key a catalogue does not define', async () => {
    await useLocaleStore.getState().setPreference('kri');

    // Nothing defines this key outside English, so it must come back in
    // English rather than as the key path or an empty string.
    expect(i18n.t('common:__fallbackProbe', 'Fallback worked')).toBe('Fallback worked');
  });

  it('translates into French once a language is chosen', async () => {
    await useLocaleStore.getState().setPreference('fr');

    expect(i18n.t('more:rows.language')).toBe('Langue');
    expect(i18n.t('common:signOut')).toBe('Se déconnecter');
  });
});

describe('catalogue', () => {
  const en = require('../locales/en.json');
  const fr = require('../locales/fr.json');
  const kri = require('../locales/kri.json');
  const tw = require('../locales/tw.json');

  const paths = (o: unknown, prefix = ''): string[] =>
    typeof o === 'object' && o !== null && !Array.isArray(o)
      ? Object.entries(o).flatMap(([k, v]) =>
          typeof v === 'object' && v !== null
            ? paths(v, `${prefix}${k}.`)
            : [`${prefix}${k}`],
        )
      : [];

  it('has a French string for every English one', () => {
    const missing = paths(en).filter((p) => !paths(fr).includes(p));
    expect(missing).toEqual([]);
  });

  it('has no French key that English does not define', () => {
    const extra = paths(fr).filter((p) => !paths(en).includes(p));
    expect(extra).toEqual([]);
  });

  it.each([
    ['fr', fr],
    ['kri', kri],
    ['tw', tw],
  ])('%s covers every English key', (_name, cat) => {
    const missing = paths(en).filter((p) => !paths(cat).includes(p));
    expect(missing).toEqual([]);
  });

  it('leaves no empty string, which would render as a blank label', () => {
    const blanks = Object.entries({ en, fr, kri, tw }).flatMap(([loc, cat]) =>
      paths(cat)
        .filter((p) => p.split('.').reduce<any>((o, k) => o?.[k], cat) === '')
        .map((p) => `${loc}:${p}`),
    );
    expect(blanks).toEqual([]);
  });
});
