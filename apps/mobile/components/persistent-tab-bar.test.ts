/**
 * Guards the arithmetic in `useTabBarReservedSpace`.
 *
 * This shipped wrong once: the hook subtracted `insets.bottom` on the belief
 * that every screen re-applied it via `SafeAreaView edges={['top', 'bottom']}`.
 * Only two authenticated screens actually did, so on any device with a home
 * indicator or gesture bar the other ~100 screens still ran their last rows
 * under the bar by exactly the inset. Nothing caught it because nothing tested
 * it, and the bug is invisible on a device whose bottom inset is 0.
 *
 * The invariant: reserved space == the bar's own rendered height, which is
 * TAB_BAR_CONTENT_HEIGHT + max(insets.bottom, 8) — the same expression the
 * container style uses for its paddingBottom.
 */
import { act, renderHook } from '@testing-library/react-native';
import type { MemberProfile } from '@kairos/types';
import { useAuthStore } from '@/store/auth';
import {
  TAB_BAR_CONTENT_HEIGHT,
  useTabBarReservedSpace,
  useTabBarVisible,
} from './persistent-tab-bar';

let mockSegments: string[] = ['(tabs)'];
let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };

jest.mock('expo-router', () => ({
  ...jest.requireActual<object>('expo-router'),
  useSegments: () => mockSegments,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

function signIn(overrides: Partial<MemberProfile> = {}) {
  useAuthStore.setState({
    accessToken: 'token',
    refreshToken: 'refresh',
    user: {
      approvalStatus: 'approved',
      mustCompleteProfile: false,
      ...overrides,
    } as MemberProfile,
  });
}

beforeEach(() => {
  mockSegments = ['(tabs)'];
  mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
});

describe('useTabBarReservedSpace', () => {
  it('reserves the bar height INCLUDING the safe-area inset', () => {
    signIn();
    mockInsets = { top: 0, bottom: 24, left: 0, right: 0 };

    const { result } = renderHook(() => useTabBarReservedSpace());

    // The regression: this returned TAB_BAR_CONTENT_HEIGHT (56) before, so
    // content overlapped the bar by the inset on every gesture-nav device.
    expect(result.current).toBe(TAB_BAR_CONTENT_HEIGHT + 24);
  });

  it('falls back to the 8px minimum when the device has no bottom inset', () => {
    signIn();

    const { result } = renderHook(() => useTabBarReservedSpace());

    expect(result.current).toBe(TAB_BAR_CONTENT_HEIGHT + 8);
  });

  it('uses the 8px floor when the inset is smaller than it', () => {
    signIn();
    mockInsets = { top: 0, bottom: 3, left: 0, right: 0 };

    const { result } = renderHook(() => useTabBarReservedSpace());

    expect(result.current).toBe(TAB_BAR_CONTENT_HEIGHT + 8);
  });

  it('reserves nothing on auth routes', () => {
    signIn();
    mockSegments = ['(auth)', 'login'];

    const { result } = renderHook(() => useTabBarReservedSpace());

    expect(result.current).toBe(0);
  });

  it('reserves nothing on onboarding routes', () => {
    signIn();
    mockSegments = ['(onboarding)', 'branch'];

    const { result } = renderHook(() => useTabBarReservedSpace());

    expect(result.current).toBe(0);
  });

  it('reserves nothing when signed out', () => {
    const { result } = renderHook(() => useTabBarReservedSpace());

    expect(result.current).toBe(0);
  });

  it('reserves nothing while the profile is incomplete', () => {
    signIn({ mustCompleteProfile: true });

    const { result } = renderHook(() => useTabBarReservedSpace());

    expect(result.current).toBe(0);
  });

  it('reserves nothing while approval is pending', () => {
    signIn({ approvalStatus: 'pending' });

    const { result } = renderHook(() => useTabBarReservedSpace());

    expect(result.current).toBe(0);
  });

  it('reserves space on nested routes outside the tab group', () => {
    signIn();
    mockInsets = { top: 0, bottom: 34, left: 0, right: 0 };
    mockSegments = ['fellowships', '[id]'];

    const { result } = renderHook(() => useTabBarReservedSpace());

    expect(result.current).toBe(TAB_BAR_CONTENT_HEIGHT + 34);
  });
});

describe('useTabBarVisible', () => {
  it('agrees with useTabBarReservedSpace about when the bar is on screen', () => {
    const cases: { segments: string[]; signedIn: boolean }[] = [
      { segments: ['(tabs)'], signedIn: true },
      { segments: ['(auth)', 'login'], signedIn: true },
      { segments: ['(onboarding)', 'branch'], signedIn: true },
      { segments: ['profile'], signedIn: true },
      { segments: ['(tabs)'], signedIn: false },
    ];

    for (const { segments, signedIn } of cases) {
      mockSegments = segments;
      mockInsets = { top: 0, bottom: 24, left: 0, right: 0 };
      act(() => {
        if (signedIn) signIn();
        else useAuthStore.setState({ accessToken: null, user: null });
      });

      const visibleHook = renderHook(() => useTabBarVisible());
      const reservedHook = renderHook(() => useTabBarReservedSpace());

      expect(reservedHook.result.current > 0).toBe(visibleHook.result.current);

      visibleHook.unmount();
      reservedHook.unmount();
    }
  });
});
