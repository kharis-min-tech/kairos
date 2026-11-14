import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { TESTIMONY_FORM } from '@kairos/types';
import type { FormMemberSearchResult } from '@kairos/types';

const authState = { user: { id: 'me', homeBranchId: 'branch-1', branchName: 'Central' } };
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

const submitMutate = vi.fn();
let searchResults: FormMemberSearchResult[] = [];
vi.mock('@/hooks/use-forms', () => ({
  useSubmitForm: () => ({
    mutateAsync: submitMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
  useFormMemberSearch: () => ({ data: searchResults, isFetching: false }),
}));

import { DeclarativeForm } from './declarative-form';

const ADA: FormMemberSearchResult = {
  id: 'm-9',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '0700',
  memberType: 'member',
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderForm() {
  return render(<DeclarativeForm definition={TESTIMONY_FORM} />, { wrapper });
}

/** Answer one of the explicit yes/no questions. */
async function answer(
  user: ReturnType<typeof userEvent.setup>,
  question: string,
  value: 'Yes' | 'No',
) {
  const group = screen.getByRole('radiogroup', { name: question });
  await user.click(within(group).getByRole('radio', { name: value }));
}

/** Everything the form needs, except the two sharing answers. */
async function fillBody(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^First name/), 'Ada');
  await user.type(screen.getByLabelText(/^Last name/), 'Lovelace');
  await user.type(screen.getByLabelText(/^Phone/), '0700');
  // todaysDate is pre-filled from its `defaultValue: 'today'`, so the one
  // outstanding date is the one the testimony is about.
  await user.click(screen.getByRole('button', { name: /Select date/ }));
  await user.click(screen.getByRole('button', { name: /^Today$/ }));
  await user.click(screen.getByText(/Choose a category/));
  await user.click(screen.getByRole('button', { name: 'Salvation' }));
  await user.type(screen.getByLabelText(/What happened\?/), 'God did it');
}

beforeEach(() => {
  vi.clearAllMocks();
  searchResults = [];
  submitMutate.mockResolvedValue({ id: 's-1' });
});

// Re-homed from the deleted bespoke `TestimonyForm`. Everything here was real
// behaviour that lived only in that component; it now has to hold through the
// declarative renderer, because that is the only renderer left.
describe('DeclarativeForm — testimony', () => {
  describe('the sharing questions stay explicit', () => {
    it('asks yes/no rather than offering a checkbox to leave untouched', () => {
      renderForm();
      expect(
        screen.getByRole('radiogroup', { name: 'Share anonymously?' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radiogroup', { name: 'Happy to share during Sunday service?' }),
      ).toBeInTheDocument();
    });

    it('blocks submit until both are answered, either way round', async () => {
      const user = userEvent.setup();
      renderForm();
      await fillBody(user);
      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));

      expect(await screen.findByText(/Share anonymously\? is required/)).toBeInTheDocument();
      expect(
        screen.getByText(/Happy to share during Sunday service\? is required/),
      ).toBeInTheDocument();
      expect(submitMutate).not.toHaveBeenCalled();
    });

    it('submits a chosen "No" as false, which is what the API requires', async () => {
      const user = userEvent.setup();
      renderForm();
      await fillBody(user);
      await answer(user, 'Share anonymously?', 'No');
      await answer(user, 'Happy to share during Sunday service?', 'Yes');
      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

      const call = submitMutate.mock.calls[0]![0];
      expect(call.formType).toBe('testimony');
      expect(call.data.payload).toMatchObject({
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '0700',
        category: 'Salvation',
        details: 'God did it',
        shareAnonymously: false,
        happyToShareSunday: true,
      });
      expect(call.data.payload.todaysDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(call.data.payload.dateOfTestimony).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    // Removed 2026-10-07. The form used to carry its own attestation on top of
    // the privacy notice, and the sentence asserted two unrelated things — that
    // the testimony is true, and that Kharis may make contact. The privacy
    // notice below the submit is the one consent gate, and it stays.
    it('asks for no attestation beyond the privacy notice', () => {
      renderForm();
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(1);
      expect(checkboxes[0]).toHaveAccessibleName(/privacy notice/i);
      expect(screen.queryByText(/I confirm this is my testimony/)).not.toBeInTheDocument();
    });
  });

  // The behaviour that most needed to survive the move: an anonymous testimony
  // must not carry a reference to the person who gave it.
  describe('anonymity', () => {
    it('locks the subject control and says why, once anonymity is chosen', async () => {
      const user = userEvent.setup();
      renderForm();

      const link = screen.getByLabelText(/Find the person giving the testimony/);
      expect(link).not.toBeDisabled();

      await answer(user, 'Share anonymously?', 'Yes');
      expect(screen.getByLabelText(/Find the person giving the testimony/)).toBeDisabled();
      expect(
        screen.getByText(/An anonymous submission won’t be linked to anyone’s record/),
      ).toBeInTheDocument();
    });

    it('drops a link that was made before anonymity was chosen', async () => {
      searchResults = [ADA];
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/Find the person giving the testimony/), 'ada');
      await user.click(await screen.findByRole('option', { name: /^Ada Lovelace/ }));
      // Linking pre-fills the giver's details, as it always did.
      expect(screen.getByLabelText(/^First name/)).toHaveValue('Ada');
      expect(screen.getByLabelText(/^Phone/)).toHaveValue('0700');

      await fillBody(user);
      await answer(user, 'Share anonymously?', 'Yes');
      await answer(user, 'Happy to share during Sunday service?', 'No');
      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

      const call = submitMutate.mock.calls[0]![0];
      expect(call.data.subjectMemberId).toBeUndefined();
      expect(call.data.payload.shareAnonymously).toBe(true);
    });

    it('carries the link when the testimony is not anonymous', async () => {
      searchResults = [ADA];
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/Find the person giving the testimony/), 'ada');
      await user.click(await screen.findByRole('option', { name: /^Ada Lovelace/ }));
      await fillBody(user);
      await answer(user, 'Share anonymously?', 'No');
      await answer(user, 'Happy to share during Sunday service?', 'Yes');
      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

      expect(submitMutate.mock.calls[0]![0].data.subjectMemberId).toBe('m-9');
    });
  });

  it('shows the testimony’s own success copy, from the definition', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillBody(user);
    await answer(user, 'Share anonymously?', 'No');
    await answer(user, 'Happy to share during Sunday service?', 'No');
    await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));

    expect(await screen.findByText('Testimony shared')).toBeInTheDocument();
    expect(
      screen.getByText(/Thank you for sharing your testimony\. To God be the glory!/),
    ).toBeInTheDocument();
  });
});
