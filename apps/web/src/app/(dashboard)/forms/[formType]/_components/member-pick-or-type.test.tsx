import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import type { FormFieldDef, FormMemberSearchResult } from '@kairos/types';

const authState = { user: { id: 'me', homeBranchId: 'branch-1' } };
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

let searchResults: FormMemberSearchResult[] = [];
let searching = false;
vi.mock('@/hooks/use-forms', () => ({
  useFormMemberSearch: () => ({ data: searchResults, isFetching: searching }),
}));

import { MemberPickOrType } from './member-pick-or-type';

const ADA: FormMemberSearchResult = {
  id: 'm-7',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '0700',
  memberType: 'member',
};

const GUARDIAN: FormFieldDef = {
  id: 'guardianMemberId',
  type: 'member',
  label: 'Guardian',
  freeTextFieldId: 'guardianName',
  required: true,
};

const INVITED_BY: FormFieldDef = {
  id: 'invitedByMemberId',
  type: 'member',
  label: 'Who invited you?',
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

/**
 * Drives the component the way the form does: one bag of values, the two keys
 * written only through the component's callbacks. If the invariant can be
 * broken, it shows up here as a bag with both keys set.
 */
function Harness({ field = GUARDIAN }: { field?: FormFieldDef }) {
  const [bag, setBag] = useState<Record<string, string>>({});
  const companionId = field.freeTextFieldId;
  return (
    <>
      <MemberPickOrType
        field={field}
        memberId={bag[field.id] ?? ''}
        typedName={companionId ? (bag[companionId] ?? '') : ''}
        onPickMember={(m) =>
          setBag((p) => ({
            ...p,
            [field.id]: m ? m.id : '',
            ...(companionId ? { [companionId]: '' } : {}),
          }))
        }
        onTypeName={
          companionId
            ? (name) => setBag((p) => ({ ...p, [companionId]: name, [field.id]: '' }))
            : undefined
        }
      />
      <output data-testid="bag">{JSON.stringify(bag)}</output>
    </>
  );
}

function bagValue(): Record<string, string> {
  return JSON.parse(screen.getByTestId('bag').textContent || '{}');
}

beforeEach(() => {
  vi.clearAllMocks();
  searchResults = [];
  searching = false;
});

describe('MemberPickOrType', () => {
  describe('one question, one control', () => {
    it('renders a single labelled combobox and no second name input', () => {
      render(<Harness />, { wrapper });
      const input = screen.getByRole('combobox', { name: /Guardian/ });
      expect(input).toBeInTheDocument();
      // The old composition stacked a second labelled "Full name" input under
      // an "…or type their name" label. One question now has one control.
      expect(screen.queryByPlaceholderText('Full name')).not.toBeInTheDocument();
      expect(screen.queryByText(/or type their name/i)).not.toBeInTheDocument();
      expect(screen.getAllByText(/^Guardian$/)).toHaveLength(1);
    });

    it('offers the plain-name fallback as the last option, only once searching', async () => {
      const user = userEvent.setup();
      render(<Harness />, { wrapper });
      const input = screen.getByRole('combobox', { name: /Guardian/ });

      await user.type(input, 'G');
      expect(screen.getByText(/Keep typing to search the directory/)).toBeInTheDocument();
      expect(screen.queryByRole('option')).not.toBeInTheDocument();

      await user.type(input, 'race Adeyemi');
      expect(
        screen.getByRole('option', { name: /Use “Grace Adeyemi” as a name only/ }),
      ).toBeInTheDocument();
    });

    it('omits the plain-name fallback for a reference-only field', async () => {
      searchResults = [ADA];
      const user = userEvent.setup();
      render(<Harness field={INVITED_BY} />, { wrapper });
      await user.type(screen.getByRole('combobox', { name: /Who invited you/ }), 'ada');
      expect(screen.getByRole('option', { name: /^Ada Lovelace/ })).toBeInTheDocument();
      expect(screen.queryByText(/as a name only/)).not.toBeInTheDocument();
    });
  });

  describe('mutual exclusion', () => {
    it('typing stores the name only, never a reference', async () => {
      const user = userEvent.setup();
      render(<Harness />, { wrapper });
      await user.type(screen.getByRole('combobox', { name: /Guardian/ }), 'Grace Adeyemi');
      expect(bagValue()).toEqual({ guardianName: 'Grace Adeyemi', guardianMemberId: '' });
    });

    it('picking a match clears the typed name', async () => {
      searchResults = [ADA];
      const user = userEvent.setup();
      render(<Harness />, { wrapper });
      const input = screen.getByRole('combobox', { name: /Guardian/ });

      await user.type(input, 'Ada Lovelace');
      expect(bagValue().guardianName).toBe('Ada Lovelace');

      await user.click(screen.getByRole('option', { name: /^Ada Lovelace/ }));
      expect(bagValue()).toEqual({ guardianMemberId: 'm-7', guardianName: '' });
    });

    it('typing again after a pick clears the reference', async () => {
      searchResults = [ADA];
      const user = userEvent.setup();
      render(<Harness />, { wrapper });
      await user.type(screen.getByRole('combobox', { name: /Guardian/ }), 'ada');
      await user.click(screen.getByRole('option', { name: /^Ada Lovelace/ }));
      expect(bagValue().guardianMemberId).toBe('m-7');

      // A linked answer collapses the input away, so the only route back to
      // typing is Change — which is exactly what makes both-set unreachable.
      await user.click(screen.getByRole('button', { name: /Change guardian/i }));
      await user.type(screen.getByRole('combobox', { name: /Guardian/ }), 'Someone Else');
      expect(bagValue()).toEqual({ guardianMemberId: '', guardianName: 'Someone Else' });
    });

    it('never exposes both an input and a linked record at the same time', async () => {
      searchResults = [ADA];
      const user = userEvent.setup();
      render(<Harness />, { wrapper });
      await user.type(screen.getByRole('combobox', { name: /Guardian/ }), 'ada');
      await user.click(screen.getByRole('option', { name: /^Ada Lovelace/ }));

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    });

    it('clearing the input clears both keys', async () => {
      const user = userEvent.setup();
      render(<Harness />, { wrapper });
      await user.type(screen.getByRole('combobox', { name: /Guardian/ }), 'Grace');
      await user.click(screen.getByRole('button', { name: /Clear guardian/i }));
      expect(bagValue()).toEqual({ guardianMemberId: '', guardianName: '' });
    });
  });

  describe('a linked member reads differently from a typed name', () => {
    it('marks a linked answer as a directory member', async () => {
      searchResults = [ADA];
      const user = userEvent.setup();
      render(<Harness />, { wrapper });
      await user.type(screen.getByRole('combobox', { name: /Guardian/ }), 'ada');
      await user.click(screen.getByRole('option', { name: /^Ada Lovelace/ }));

      expect(screen.getByText('Directory member')).toBeInTheDocument();
      expect(screen.queryByText(/name only/i)).not.toBeInTheDocument();
    });

    it('marks a typed answer as a name only', async () => {
      const user = userEvent.setup();
      render(<Harness />, { wrapper });
      await user.type(screen.getByRole('combobox', { name: /Guardian/ }), 'Grace Adeyemi');
      await user.click(screen.getByRole('option', { name: /Use “Grace Adeyemi” as a name only/ }));

      expect(
        screen.getByText(/Recorded as a name only — not linked to anyone in the directory/),
      ).toBeInTheDocument();
      expect(screen.queryByText('Directory member')).not.toBeInTheDocument();
    });
  });
});
