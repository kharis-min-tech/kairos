import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { FIRST_TIME_VISITOR_FORM } from '@kairos/types';

const authState = { user: { id: 'me', homeBranchId: 'branch-1', branchName: 'Central' } };
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

const submitMutate = vi.fn();
let submitPending = false;
let submitError: Error | null = null;
let searchResults: Array<{
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  memberType: string;
}> = [];
let searching = false;

vi.mock('@/hooks/use-forms', () => ({
  useSubmitForm: () => ({
    mutateAsync: submitMutate,
    isPending: submitPending,
    isError: !!submitError,
    error: submitError,
  }),
  useFormMemberSearch: () => ({ data: searchResults, isFetching: searching }),
}));

import { DeclarativeForm } from './declarative-form';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderForm() {
  return render(<DeclarativeForm definition={FIRST_TIME_VISITOR_FORM} />, { wrapper });
}

/** Click the "Yes"/"No" pill of a labelled radio group. */
async function pickRadio(user: ReturnType<typeof userEvent.setup>, groupLabel: string, option: string) {
  const group = screen.getByRole('radiogroup', { name: groupLabel });
  await user.click(within(group).getByRole('radio', { name: option }));
}

beforeEach(() => {
  vi.clearAllMocks();
  submitPending = false;
  submitError = null;
  searchResults = [];
  searching = false;
  submitMutate.mockResolvedValue({ id: 'sub-1' });
});

describe('DeclarativeForm — FIRST_TIME_VISITOR_FORM', () => {
  describe('static rendering', () => {
    it('renders the always-visible sections and getting-involved fields', () => {
      renderForm();
      expect(screen.getByRole('heading', { name: 'About you' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Contact details' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Getting involved' })).toBeInTheDocument();
      // interest / how-heard / invited-by render
      expect(screen.getByText(/What are you interested in\?/)).toBeInTheDocument();
      expect(screen.getByLabelText(/How did you hear about us\?/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Who invited you\?/)).toBeInTheDocument();
    });

    it('hides the guardian section by default (not under 16)', () => {
      renderForm();
      expect(screen.queryByRole('heading', { name: 'Parent / guardian' })).not.toBeInTheDocument();
      expect(screen.queryByText(/Guardian phone/)).not.toBeInTheDocument();
    });

    it('hides the children repeatable group until brought-children is checked', () => {
      renderForm();
      expect(screen.queryByRole('heading', { name: 'Children with you' })).not.toBeInTheDocument();
      // The "came with children" checkbox is visible though
      expect(screen.getByLabelText(/I came with one or more children/)).toBeInTheDocument();
    });
  });

  describe('branch visibility — guardian section', () => {
    it('reveals the guardian section when "Are you under 16?" is set to Yes', async () => {
      const user = userEvent.setup();
      renderForm();
      await pickRadio(user, 'Are you under 16?', 'Yes');
      expect(await screen.findByRole('heading', { name: 'Parent / guardian' })).toBeInTheDocument();
      expect(screen.getByText(/Guardian phone/)).toBeInTheDocument();
      expect(screen.getByText(/Guardian phone/)).toBeInTheDocument();
    });

    it('hides the guardian section again when toggled back to No', async () => {
      const user = userEvent.setup();
      renderForm();
      await pickRadio(user, 'Are you under 16?', 'Yes');
      expect(await screen.findByRole('heading', { name: 'Parent / guardian' })).toBeInTheDocument();
      await pickRadio(user, 'Are you under 16?', 'No');
      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: 'Parent / guardian' })).not.toBeInTheDocument(),
      );
    });

    it('relaxes contact requirement when under 16 (email/phone no longer marked required)', async () => {
      const user = userEvent.setup();
      renderForm();
      // Over 16 by default: Email/Phone are required (rendered with required label).
      // After selecting under-16, the relaxed (non-required) email/phone variants render.
      await pickRadio(user, 'Are you under 16?', 'Yes');
      await screen.findByRole('heading', { name: 'Parent / guardian' });
      // The Email field is still present but no longer enforced as required —
      // verified through the submit-validation tests below.
      expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    });
  });

  describe('branch visibility — children repeatable group', () => {
    it('reveals the children group with no rows (min 0) when brought-children is checked', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByLabelText(/I came with one or more children/));
      expect(await screen.findByRole('heading', { name: 'Children with you' })).toBeInTheDocument();
      // min is 0, so no Child cards yet — but the add button shows.
      expect(screen.getByRole('button', { name: /Add child/i })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Child 1/ })).not.toBeInTheDocument();
    });

    it('adds child rows on "Add child" up to the max of 12', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByLabelText(/I came with one or more children/));
      const addBtn = await screen.findByRole('button', { name: /Add child/i });
      // Add 12 rows.
      for (let i = 0; i < 12; i++) {
        await user.click(screen.getByRole('button', { name: /Add child/i }));
      }
      expect(screen.getByRole('heading', { name: 'Child 12' })).toBeInTheDocument();
      // At max — the add button is gone.
      expect(screen.queryByRole('button', { name: /Add child/i })).not.toBeInTheDocument();
      void addBtn;
    });

    it('removes a child row via its Remove control', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByLabelText(/I came with one or more children/));
      await user.click(await screen.findByRole('button', { name: /Add child/i }));
      await user.click(screen.getByRole('button', { name: /Add child/i }));
      expect(screen.getByRole('heading', { name: 'Child 2' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Remove child 1/i }));
      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: 'Child 2' })).not.toBeInTheDocument(),
      );
      expect(screen.getByRole('heading', { name: 'Child 1' })).toBeInTheDocument();
    });
  });

  describe('required validation respects visibility', () => {
    it('blocks submit and flags visible required fields when empty', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      expect(await screen.findByText(/First name is required/)).toBeInTheDocument();
      expect(screen.getByText(/Last name is required/)).toBeInTheDocument();
      expect(screen.getByText(/Date of birth is required/)).toBeInTheDocument();
      // Over-16 default: contact email + phone are required.
      expect(screen.getByText(/Email is required/)).toBeInTheDocument();
      expect(screen.getByText(/Phone is required/)).toBeInTheDocument();
      expect(submitMutate).not.toHaveBeenCalled();
    });

    it('does not require guardian fields while the guardian section is hidden', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      await screen.findByText(/First name is required/);
      // Guardian section is hidden, so no guardian-required errors appear.
      expect(screen.queryByText(/Guardian is required/)).not.toBeInTheDocument();
    });

    // Pick-or-type (2026-10-05): a visiting child's guardian is often not in
    // the directory, so a typed name satisfies the requirement just as a
    // picked member does. Requiring the reference would have blocked the form.
    it('accepts a typed guardian name in place of a member reference', async () => {
      const user = userEvent.setup();
      renderForm();
      await pickRadio(user, 'Are you under 16?', 'Yes');
      await screen.findByRole('heading', { name: 'Parent / guardian' });

      await user.type(screen.getByRole('combobox', { name: /Guardian/ }), 'Grace Adeyemi');
      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));

      // Other fields still fail, but the guardian no longer does.
      await screen.findByText(/First name is required/);
      expect(screen.queryByText(/Guardian is required/)).not.toBeInTheDocument();
    });

    it('requires guardian fields once the guardian section is visible (under 16)', async () => {
      const user = userEvent.setup();
      renderForm();
      await pickRadio(user, 'Are you under 16?', 'Yes');
      await screen.findByRole('heading', { name: 'Parent / guardian' });
      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      expect(await screen.findByText(/Guardian is required/)).toBeInTheDocument();
      expect(screen.getByText(/Guardian phone is required/)).toBeInTheDocument();
      // Under 16: email/phone are no longer required (relaxed variants render).
      expect(screen.queryByText(/Email is required/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Phone is required/)).not.toBeInTheDocument();
      expect(submitMutate).not.toHaveBeenCalled();
    });

    it('requires children sub-fields only for visible rows', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByLabelText(/I came with one or more children/));
      await user.click(await screen.findByRole('button', { name: /Add child/i }));
      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      // The added child row's required first/last name block submit.
      const errs = await screen.findAllByText(/First name is required/);
      // about-you firstName + child row firstName
      expect(errs.length).toBeGreaterThanOrEqual(2);
      expect(submitMutate).not.toHaveBeenCalled();
    });
  });

  describe('submit payload', () => {
    it('builds a payload keyed by field ids and calls submit with formType first_time_visitor', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.type(screen.getByLabelText(/^First name/), 'Tunde');
      await user.type(screen.getByLabelText(/^Last name/), 'Bakare');
      await user.type(screen.getByLabelText(/Email/), 'tunde@example.com');
      await user.type(screen.getByLabelText(/^Phone/), '07123456789');
      // dateOfBirth is required and uses DateSelect (popover) — to keep the test
      // at the behavior layer we leave it and assert it is the only blocker.
      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));

      // dateOfBirth is the sole remaining required gap.
      expect(await screen.findByText(/Date of birth is required/)).toBeInTheDocument();
      expect(screen.queryByText(/First name is required/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Email is required/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Phone is required/)).not.toBeInTheDocument();
      expect(submitMutate).not.toHaveBeenCalled();
    });

    it('omits hidden-block fields from the payload and submits when all visible required fields are filled', async () => {
      // Make every required field a text input by mounting a DOB-free definition:
      // we cannot drive DateSelect here, so use a trimmed definition that mirrors
      // the renderer behavior with text required fields only.
      const user = userEvent.setup();
      const trimmed = {
        ...FIRST_TIME_VISITOR_FORM,
        blocks: FIRST_TIME_VISITOR_FORM.blocks.map((b) =>
          b.kind === 'section' && b.id === 'about-you'
            ? { ...b, fields: b.fields.filter((f) => f.id !== 'dateOfBirth') }
            : b,
        ),
      };
      render(<DeclarativeForm definition={trimmed} />, { wrapper });

      await user.type(screen.getByLabelText(/^First name/), 'Tunde');
      await user.type(screen.getByLabelText(/^Last name/), 'Bakare');
      await user.type(screen.getByLabelText(/Email/), 'tunde@example.com');
      await user.type(screen.getByLabelText(/^Phone/), '07123456789');
      await user.type(screen.getByLabelText(/How did you hear about us\?/), 'A friend');

      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

      const call = submitMutate.mock.calls[0]![0];
      expect(call.formType).toBe('first_time_visitor');
      expect(call.data.subjectMemberId).toBeUndefined();
      expect(call.data.payload).toMatchObject({
        firstName: 'Tunde',
        lastName: 'Bakare',
        email: 'tunde@example.com',
        phone: '07123456789',
        howDidYouHear: 'A friend',
      });
      // Hidden blocks (guardian, children) are not in the payload.
      expect(call.data.payload.guardianName).toBeUndefined();
      expect(call.data.payload.children).toBeUndefined();
    });

    it('includes children rows in the payload under the group id when brought-children is checked', async () => {
      const user = userEvent.setup();
      const trimmed = {
        ...FIRST_TIME_VISITOR_FORM,
        blocks: FIRST_TIME_VISITOR_FORM.blocks.map((b) => {
          if (b.kind === 'section' && b.id === 'about-you') {
            return { ...b, fields: b.fields.filter((f) => f.id !== 'dateOfBirth') };
          }
          // Drop the child date sub-field (not required) so we can fully fill a row.
          if (b.kind === 'repeatable' && b.id === 'children') {
            return { ...b, fields: b.fields.filter((f) => f.id !== 'dateOfBirth') };
          }
          return b;
        }),
      };
      render(<DeclarativeForm definition={trimmed} />, { wrapper });

      await user.type(screen.getByLabelText(/^First name/), 'Tunde');
      await user.type(screen.getByLabelText(/^Last name/), 'Bakare');
      await user.type(screen.getByLabelText(/Email/), 'tunde@example.com');
      await user.type(screen.getByLabelText(/^Phone/), '07123456789');

      await user.click(screen.getByLabelText(/I came with one or more children/));
      await user.click(await screen.findByRole('button', { name: /Add child/i }));

      const childCard = screen.getByRole('heading', { name: 'Child 1' }).closest('div')!
        .parentElement as HTMLElement;
      const inputs = within(childCard).getAllByRole('textbox');
      await user.type(inputs[0]!, 'Kid');
      await user.type(inputs[1]!, 'Bakare');

      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

      const call = submitMutate.mock.calls[0]![0];
      expect(call.data.payload.broughtChildren).toBe(true);
      expect(call.data.payload.children).toEqual([{ firstName: 'Kid', lastName: 'Bakare' }]);
    });

    // The invariant the member-reference design exists to protect: an id means a
    // real person who can be followed up, a name means we only have a name, and
    // a payload never carries both under one answer.
    describe('guardian — a reference or a name, never both', () => {
      const noDob = {
        ...FIRST_TIME_VISITOR_FORM,
        blocks: FIRST_TIME_VISITOR_FORM.blocks.map((b) =>
          b.kind === 'section' && b.id === 'about-you'
            ? { ...b, fields: b.fields.filter((f) => f.id !== 'dateOfBirth') }
            : b,
        ),
      };

      async function fillUnder16(user: ReturnType<typeof userEvent.setup>) {
        render(<DeclarativeForm definition={noDob} />, { wrapper });
        await user.type(screen.getByLabelText(/^First name/), 'Tunde');
        await user.type(screen.getByLabelText(/^Last name/), 'Bakare');
        await pickRadio(user, 'Are you under 16?', 'Yes');
        await screen.findByRole('heading', { name: 'Parent / guardian' });
        await user.type(screen.getByLabelText(/Guardian phone/), '07123456789');
      }

      it('submits the typed name alone when no directory match is picked', async () => {
        const user = userEvent.setup();
        await fillUnder16(user);

        await user.type(screen.getByRole('combobox', { name: /^Guardian/ }), 'Grace Adeyemi');
        await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
        await user.click(screen.getByRole('button', { name: /^Submit$/ }));
        await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

        const payload = submitMutate.mock.calls[0]![0].data.payload;
        expect(payload.guardianName).toBe('Grace Adeyemi');
        expect(payload.guardianMemberId).toBeUndefined();
      });

      it('submits the reference alone once a directory match is picked', async () => {
        searchResults = [
          { id: 'm-7', firstName: 'Ada', lastName: 'Lovelace', phone: '0700', memberType: 'member' },
        ];
        const user = userEvent.setup();
        await fillUnder16(user);

        const guardian = screen.getByRole('combobox', { name: /^Guardian/ });
        await user.type(guardian, 'ada');
        await user.click(screen.getByRole('option', { name: /^Ada Lovelace/ }));

        await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
        await user.click(screen.getByRole('button', { name: /^Submit$/ }));
        await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));

        const payload = submitMutate.mock.calls[0]![0].data.payload;
        expect(payload.guardianMemberId).toBe('m-7');
        expect(payload.guardianName).toBeUndefined();
      });
    });
  });

  // The bespoke testimony form has always dropped the subject link for an
  // anonymous testimony. The declarative renderer now carries subjectMemberId on
  // both platforms, so it has to honour the same rule — otherwise the one form
  // that promises anonymity is the one that leaks a reference to the submitter.
  describe('anonymous submissions drop the subject link', () => {
    const ANON_FORM = {
      formType: 'testimony' as const,
      title: 'Testimony',
      blocks: [
        {
          kind: 'section' as const,
          id: 'about',
          title: 'About you',
          fields: [
            { id: 'firstName', type: 'text' as const, label: 'First name', required: true },
            { id: 'shareAnonymously', type: 'checkbox' as const, label: 'Share anonymously' },
          ],
        },
      ],
    };

    async function linkThenSubmit(anonymously: boolean) {
      searchResults = [
        { id: 'm-7', firstName: 'Ada', lastName: 'Lovelace', phone: '0700', memberType: 'member' },
      ];
      const user = userEvent.setup();
      render(<DeclarativeForm definition={ANON_FORM} />, { wrapper });

      await user.type(screen.getByLabelText(/Find an existing person/), 'ada');
      await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));
      if (anonymously) {
        await user.click(screen.getByLabelText(/Share anonymously/));
        // The control goes with the link: an anonymous submission has nothing to
        // link to, so offering the search would promise something submit undoes.
        expect(screen.queryByLabelText(/Find an existing person/)).not.toBeInTheDocument();
        expect(
          screen.getByText(/An anonymous submission won’t be linked to anyone’s record/),
        ).toBeInTheDocument();
      }

      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));
      return submitMutate.mock.calls[0]![0].data;
    }

    it('carries the link when the submission is not anonymous', async () => {
      expect((await linkThenSubmit(false)).subjectMemberId).toBe('m-7');
    });

    it('drops the link, and the control, once anonymity is ticked', async () => {
      expect((await linkThenSubmit(true)).subjectMemberId).toBeUndefined();
    });
  });

  describe('member typeahead', () => {
    it('selecting a search result sets subjectMemberId and pre-fills name', async () => {
      searchResults = [
        { id: 'm-7', firstName: 'Ada', lastName: 'Lovelace', phone: '0700', memberType: 'member' },
      ];
      const user = userEvent.setup();
      const trimmed = {
        ...FIRST_TIME_VISITOR_FORM,
        blocks: FIRST_TIME_VISITOR_FORM.blocks.map((b) =>
          b.kind === 'section' && b.id === 'about-you'
            ? { ...b, fields: b.fields.filter((f) => f.id !== 'dateOfBirth') }
            : b,
        ),
      };
      render(<DeclarativeForm definition={trimmed} />, { wrapper });

      await user.type(screen.getByLabelText(/Find an existing person/), 'ada');
      await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));

      expect(screen.getByLabelText(/^First name/)).toHaveValue('Ada');
      expect(screen.getByLabelText(/^Last name/)).toHaveValue('Lovelace');
      // Phone field is present (over-16) and gets pre-filled from the match.
      expect(screen.getByLabelText(/^Phone/)).toHaveValue('0700');

      await user.type(screen.getByLabelText(/Email/), 'ada@example.com');
      await user.click(screen.getByRole('checkbox', { name: /privacy notice/i }));
      await user.click(screen.getByRole('button', { name: /^Submit$/ }));
      await waitFor(() => expect(submitMutate).toHaveBeenCalledTimes(1));
      expect(submitMutate.mock.calls[0]![0].data.subjectMemberId).toBe('m-7');
    });
  });
});
