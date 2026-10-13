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

  it('serves English text for a language whose catalogue is still empty', async () => {
    await useLocaleStore.getState().setPreference('kri');

    expect(i18n.language).toBe('kri');
    // Krio has no entries yet, so every key must fall through to English
    // rather than rendering the key path or an empty string.
    expect(i18n.t('more:rows.language')).toBe('Language');
  });

  it('translates into French once a language is chosen', async () => {
    await useLocaleStore.getState().setPreference('fr');

    expect(i18n.t('more:rows.language')).toBe('Langue');
    expect(i18n.t('common:signOut')).toBe('Se déconnecter');
  });
});
