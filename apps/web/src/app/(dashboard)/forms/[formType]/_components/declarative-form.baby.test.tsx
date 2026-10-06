import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BABY_NAMING_FORM, BABY_DEDICATION_FORM } from '@kairos/types';
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

const MARY: FormMemberSearchResult = {
  id: 'p-42',
  firstName: 'Mary',
  lastName: 'Doe',
  phone: '0700111',
  memberType: 'member',
};
const JOHN: FormMemberSearchResult = {
  id: 'p-43',
  firstName: 'John',
  lastName: 'Doe',
  phone: '0700222',
  memberType: 'member',
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderNaming() {
  return render(<DeclarativeForm definition={BABY_NAMING_FORM} />, { wrapper });
}

/** Pick a directory match in the combobox with the given accessible name. */
async function pick(
  user: ReturnType<typeof userEvent.setup>,
  controlName: RegExp,
  match: FormMemberSearchResult,
) {
  searchResults = [match];
  await user.type(screen.getByRole('combobox', { name: controlName }), match.firstName);
  await user.click(
    await screen.findByRole('option', { name: new RegExp(`^${match.firstName} ${match.lastName}`) }),
  );
}

async function setDateOfBirth(user: ReturnType<typeof userEvent.setup>) {
  // dateOfBirth is the first DateSelect; the preferred-ceremony date is the second.
  await user.click(screen.getAllByRole('button', { name: /Select date/ })[0]!);
  await user.click(screen.getByRole('button', { name: /^Today$/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  searchResults = [];
  submitMutate.mockResolvedValue({ id: 's-1' });
});

// The baby forms used to render from a bespoke component on web that asked for
// plain `fathersName` / `mothersName` text, while mobile rendered the shared
// definition and captured `fatherMemberId` / `motherMemberId`. The same form
// produced different data depending on the device, so `fatherMemberId` could
// never be trusted to be populated — which defeats the reachability the member
// references exist to buy. Both platforms now render the one definition.
describe('DeclarativeForm — baby forms', () => {
  describe('the questions the bespoke form asked, in the same order', () => {
    it('asks for the baby, both parents, contact details and preferences', () => {
      renderNaming();
      expect(screen.getByLabelText(/Baby’s full name/)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /^Father/ })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /^Mother/ })).toBeInTheDocument();
      expect(screen.getByLabelText(/Parent contact phone/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Parent contact email/)).toBeInTheDocument();
      expect(screen.getByText(/Preferred ceremony date/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Anything else\?/)).toBeInTheDocument();
    });

    it('asks whether the parents are members only on the dedication form', () => {
      const { unmount } = renderNaming();
      expect(screen.queryByText(/parents are members/i)).not.toBeInTheDocument();
      unmount();

      render(<DeclarativeForm definition={BABY_DEDICATION_FORM} />, { wrapper });
      expect(screen.getByText(/One or both parents are members of Kharis/)).toBeInTheDocument();
      expect(screen.getByText(/Preferred dedication date/)).toBeInTheDocument();
    });

    it('blocks submit until the baby, both parents and the contact phone are given', async () => {
      const user = userEvent.setup();
      renderNaming();
      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));

      expect(await screen.findByText(/Baby’s full name is required/)).toBeInTheDocument();
      expect(screen.getByText(/Date of birth is required/)).toBeInTheDocument();
      expect(screen.getByText(/Father is required/)).toBeInTheDocument();
      expect(screen.getByText(/Mother is required/)).toBeInTheDocument();
      expect(screen.getByText(/Parent contact phone is required/)).toBeInTheDocument();
      expect(submitMutate).not.toHaveBeenCalled();
    });
  });

  // This is the gap that closed: on web these keys were previously unreachable.
  describe('parents are references where we have them and names where we don’t', () => {
    it('submits a reference for a picked parent and a name for a typed one', async () => {
      const user = userEvent.setup();
      renderNaming();

      await user.type(screen.getByLabelText(/Baby’s full name/), 'Baby Doe');
      await setDateOfBirth(user);
      await pick(user, /^Father/, JOHN);
      await user.type(screen.getByRole('combobox', { name: /^Mother/ }), 'Jane Doe');
      await user.type(screen.getByLabelText(/Parent contact phone/), '0700');

      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

      const call = submitMutate.mock.calls[0]![0];
      expect(call.formType).toBe('baby_naming');
      expect(call.data.payload).toMatchObject({
        babyFullName: 'Baby Doe',
        fatherMemberId: 'p-43',
        mothersName: 'Jane Doe',
        parentContactPhone: '0700',
      });
      // Exactly one key per parent — never a name beside an id.
      expect(call.data.payload.fathersName).toBeUndefined();
      expect(call.data.payload.motherMemberId).toBeUndefined();
    });

    it('accepts two typed names, so a family in no directory can still submit', async () => {
      const user = userEvent.setup();
      renderNaming();

      await user.type(screen.getByLabelText(/Baby’s full name/), 'Baby Doe');
      await setDateOfBirth(user);
      await user.type(screen.getByRole('combobox', { name: /^Father/ }), 'John Doe');
      await user.type(screen.getByRole('combobox', { name: /^Mother/ }), 'Jane Doe');
      await user.type(screen.getByLabelText(/Parent contact phone/), '0700');

      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

      const payload = submitMutate.mock.calls[0]![0].data.payload;
      expect(payload).toMatchObject({ fathersName: 'John Doe', mothersName: 'Jane Doe' });
      expect(payload.fatherMemberId).toBeUndefined();
      expect(payload.motherMemberId).toBeUndefined();
    });
  });

  describe('the parent/guardian subject link', () => {
    it('is labelled for the relationship it actually records, and pre-fills the parent phone', async () => {
      const user = userEvent.setup();
      renderNaming();

      await pick(user, /Find the parent\/guardian/, MARY);

      expect(
        screen.getByText(
          /Linked to an existing member\. They’ll be recorded as the parent\/guardian\./,
        ),
      ).toBeInTheDocument();
      // The baby form asks for a parent phone, not a `phone` — the pre-fill
      // target comes from the definition, so it lands in the right field.
      expect(screen.getByLabelText(/Parent contact phone/)).toHaveValue('0700111');
    });

    it('takes the pre-filled phone back when the link is removed', async () => {
      const user = userEvent.setup();
      renderNaming();

      await pick(user, /Find the parent\/guardian/, MARY);
      expect(screen.getByLabelText(/Parent contact phone/)).toHaveValue('0700111');

      await user.click(screen.getByRole('button', { name: /Change find the parent/i }));
      expect(screen.getByLabelText(/Parent contact phone/)).toHaveValue('');
    });

    it('leaves a phone the person has since edited alone', async () => {
      const user = userEvent.setup();
      renderNaming();

      await pick(user, /Find the parent\/guardian/, MARY);
      const phone = screen.getByLabelText(/Parent contact phone/);
      await user.clear(phone);
      await user.type(phone, '0799999');

      await user.click(screen.getByRole('button', { name: /Change find the parent/i }));
      expect(screen.getByLabelText(/Parent contact phone/)).toHaveValue('0799999');
    });

    it('carries the linked parent as subjectMemberId on submit', async () => {
      const user = userEvent.setup();
      renderNaming();

      await pick(user, /Find the parent\/guardian/, MARY);
      await user.type(screen.getByLabelText(/Baby’s full name/), 'Baby Doe');
      await setDateOfBirth(user);
      await user.type(screen.getByRole('combobox', { name: /^Father/ }), 'John Doe');
      await user.type(screen.getByRole('combobox', { name: /^Mother/ }), 'Mary Doe');

      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

      const call = submitMutate.mock.calls[0]![0];
      expect(call.data.subjectMemberId).toBe('p-42');
      expect(call.data.payload.parentContactPhone).toBe('0700111');
    });
  });

  // The old shared card hardcoded id="member-search", so three person-finders on
  // one page collided and the labels pointed at whichever won.
  it('gives each of its three person-finders its own input', () => {
    renderNaming();
    const ids = screen
      .getAllByRole('combobox')
      .map((el) => el.getAttribute('id'))
      .filter((id): id is string => !!id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });
});
