import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboardingStore } from './onboarding';

const resetStore = () => {
  useOnboardingStore.setState({
    hydrated: false,
    done: false,
    language: null,
    branchId: null,
  });
};

beforeEach(async () => {
  resetStore();
  await AsyncStorage.clear();
});

describe('useOnboardingStore', () => {
  it('hydrates to defaults when storage is empty', async () => {
    await useOnboardingStore.getState().hydrate();
    const s = useOnboardingStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.done).toBe(false);
    expect(s.language).toBeNull();
    expect(s.branchId).toBeNull();
  });

  it('rehydrates persisted selections', async () => {
    await AsyncStorage.setItem('kairos.onboarding.language', 'tw');
    await AsyncStorage.setItem('kairos.onboarding.branch_id', 'br-1');
    await AsyncStorage.setItem('kairos.onboarding.done', 'true');

    await useOnboardingStore.getState().hydrate();
    const s = useOnboardingStore.getState();
    expect(s.language).toBe('tw');
    expect(s.branchId).toBe('br-1');
    expect(s.done).toBe(true);
  });

  it('setLanguage + setBranchId + markDone persist through', async () => {
    const store = useOnboardingStore.getState();
    await store.setLanguage('fr');
    await store.setBranchId('br-9');
    await store.markDone();

    expect(await AsyncStorage.getItem('kairos.onboarding.language')).toBe('fr');
    expect(await AsyncStorage.getItem('kairos.onboarding.branch_id')).toBe('br-9');
    expect(await AsyncStorage.getItem('kairos.onboarding.done')).toBe('true');

    const s = useOnboardingStore.getState();
    expect(s.language).toBe('fr');
    expect(s.branchId).toBe('br-9');
    expect(s.done).toBe(true);
  });

  it('reset clears everything', async () => {
    const store = useOnboardingStore.getState();
    await store.setLanguage('en');
    await store.setBranchId('br-2');
    await store.markDone();
    await store.reset();

    const s = useOnboardingStore.getState();
    expect(s.language).toBeNull();
    expect(s.branchId).toBeNull();
    expect(s.done).toBe(false);
    expect(await AsyncStorage.getItem('kairos.onboarding.language')).toBeNull();
  });
});
