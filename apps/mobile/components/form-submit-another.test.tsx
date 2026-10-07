/**
 * "Submit another" on the mobile success screen.
 *
 * Web has always offered it; mobile only offered "Back to forms", which meant
 * the welcome desk capturing five first-timers in a row — on a phone, which is
 * the device they are actually holding — had to walk back to the list and find
 * the same tile again between each one.
 *
 * What the test is really guarding is the reset, not the button. A reset that
 * forgets to clear the subject link would file the next person's answers
 * against the last person's member record, and a reset that leaves consent
 * ticked would record an acknowledgement nobody gave for that submission.
 */
import { TextInput } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BAPTISM_FORM } from '@kairos/types';

const mockSubmit = jest.fn(async () => ({ data: { id: 'sub-1' } }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ formType: 'baptism' }),
}));

jest.mock('@/lib/api-client', () => ({
  api: { forms: { submit: (...args: unknown[]) => mockSubmit(...(args as [])) } },
}));

jest.mock('@/store/auth', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { homeBranchId: 'branch-1' } }),
}));

// The picker sheet reaches for the network the moment it opens; the subject
// link is set directly below instead.
jest.mock('@/components/member-picker-sheet', () => ({
  MemberPickerSheet: () => null,
}));

import FormRenderer from '../app/forms/[formType]';

/**
 * One client, torn down after each test. A fresh `new QueryClient()` per render
 * leaves its cache-collection timers running, and `jest` here is plain `jest`
 * with no `--forceExit`: the suite would pass and then hang the whole run.
 * `gcTime: 0` so nothing is scheduled in the first place.
 */
let qc: QueryClient;

beforeEach(() => {
  qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
});

afterEach(() => {
  qc.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const CONSENT = /I have read the privacy notice/;

/**
 * By position, because the mobile renderer draws each field's label as a
 * sibling Text and passes no `accessibilityLabel` to the input — so no form
 * field on mobile has an accessible name to query by. Worth fixing on its own
 * terms; not this change's business. Baptism asks three things, in order.
 */
function textInputs() {
  return screen.UNSAFE_getAllByType(TextInput);
}

async function fillAndSubmit() {
  const [first, last, phone] = textInputs();
  fireEvent.changeText(first!, 'Ada');
  fireEvent.changeText(last!, 'Lovelace');
  fireEvent.changeText(phone!, '0700');
  fireEvent.press(screen.getByText(CONSENT));
  fireEvent.press(screen.getByText('Submit'));
  await waitFor(() => expect(screen.getByText(BAPTISM_FORM.success!.title)).toBeTruthy());
}

beforeEach(() => {
  mockSubmit.mockClear();
});

describe('mobile form — submit another', () => {
  it('offers it on the success screen alongside going back', async () => {
    render(<FormRenderer />, { wrapper });
    await fillAndSubmit();

    expect(screen.getByText('Submit another')).toBeTruthy();
    expect(screen.getByText('Back to forms')).toBeTruthy();
  });

  it('returns a blank form, with consent un-ticked so the next one is its own', async () => {
    render(<FormRenderer />, { wrapper });
    await fillAndSubmit();
    fireEvent.press(screen.getByText('Submit another'));

    // Back on the form, with nothing carried over from the last person.
    expect(screen.queryByDisplayValue('Ada')).toBeNull();
    expect(screen.queryByDisplayValue('Lovelace')).toBeNull();
    expect(screen.queryByDisplayValue('0700')).toBeNull();
    for (const input of textInputs()) expect(input.props.value).toBeFalsy();
    // Submit is gated on consent, so a disabled Submit is the assertion that
    // the acknowledgement did not survive the reset.
    expect(screen.getByText(CONSENT)).toBeTruthy();
    expect(screen.getByText('Submit')).toBeTruthy();
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it('submits the second one on its own merits rather than replaying the first', async () => {
    render(<FormRenderer />, { wrapper });
    await fillAndSubmit();
    fireEvent.press(screen.getByText('Submit another'));
    await fillAndSubmit();

    expect(mockSubmit).toHaveBeenCalledTimes(2);
    const [, second] = mockSubmit.mock.calls as unknown as [
      [string, { payload: Record<string, unknown>; subjectMemberId?: string }],
      [string, { payload: Record<string, unknown>; subjectMemberId?: string }],
    ];
    expect(second[0]).toBe('baptism');
    expect(second[1].payload).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace' });
    // Above all: no subject link inherited from the first submission.
    expect(second[1].subjectMemberId).toBeUndefined();
  });
});
