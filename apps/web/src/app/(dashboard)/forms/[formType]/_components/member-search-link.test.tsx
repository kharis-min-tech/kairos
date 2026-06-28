import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const authState = { user: { id: 'me', homeBranchId: 'branch-1', branchName: 'Central' } };
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

const submitMutate = vi.fn();
let searchResults: Array<{
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  memberType: string;
}> = [];
let searchFetching = false;
// Captures the args useFormMemberSearch is called with, so we can assert the
// "enabled" gating (>=2 chars, not disabled, open) the component is responsible for.
let lastSearchCall: { query: unknown; options: unknown } | undefined;

vi.mock('@/hooks/use-forms', () => ({
  useSubmitForm: () => ({
    mutateAsync: submitMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
  useFormMemberSearch: (query: unknown, options: unknown) => {
    lastSearchCall = { query, options };
    return { data: searchResults, isFetching: searchFetching };
  },
}));

import { MemberSearchLink } from './member-search-link';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  searchResults = [];
  searchFetching = false;
  lastSearchCall = undefined;
});

describe('MemberSearchLink', () => {
  it('renders the labelled search input and help text', () => {
    render(<MemberSearchLink onSelect={vi.fn()} onClear={vi.fn()} />, { wrapper });
    expect(screen.getByLabelText(/Find an existing person/)).toBeInTheDocument();
    expect(
      screen.getByText(/Search by name or phone\. Leave blank to create a new contact\./),
    ).toBeInTheDocument();
  });

  it('uses a custom label and helpText when provided', () => {
    render(
      <MemberSearchLink
        onSelect={vi.fn()}
        onClear={vi.fn()}
        label="Find the baptism candidate"
        helpText="Custom help"
      />,
      { wrapper },
    );
    expect(screen.getByLabelText(/Find the baptism candidate/)).toBeInTheDocument();
    expect(screen.getByText('Custom help')).toBeInTheDocument();
  });

  it('does not open results for fewer than 2 characters', async () => {
    searchResults = [
      { id: 'm-1', firstName: 'Ada', lastName: 'Lovelace', phone: '0700', memberType: 'member' },
    ];
    const user = userEvent.setup();
    render(<MemberSearchLink onSelect={vi.fn()} onClear={vi.fn()} />, { wrapper });

    await user.type(screen.getByLabelText(/Find an existing person/), 'a');
    expect(screen.queryByRole('button', { name: /Ada Lovelace/ })).not.toBeInTheDocument();
    // The query hook is gated to disabled (enabled:false) for <2 chars.
    expect((lastSearchCall!.options as { enabled: boolean }).enabled).toBe(false);
  });

  it('opens results once 2+ chars are typed and lists matches', async () => {
    searchResults = [
      { id: 'm-9', firstName: 'Ada', lastName: 'Lovelace', phone: '0700', memberType: 'member' },
      { id: 'm-10', firstName: 'Adam', lastName: 'Smith', phone: null, memberType: 'attendee' },
    ];
    const user = userEvent.setup();
    render(<MemberSearchLink onSelect={vi.fn()} onClear={vi.fn()} />, { wrapper });

    await user.type(screen.getByLabelText(/Find an existing person/), 'ad');
    expect(await screen.findByRole('button', { name: /Ada Lovelace/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adam Smith/ })).toBeInTheDocument();
    // The match with no phone renders "No phone".
    expect(screen.getByText(/No phone/)).toBeInTheDocument();
    expect((lastSearchCall!.options as { enabled: boolean }).enabled).toBe(true);
  });

  it('shows a Searching… state while fetching', async () => {
    searchFetching = true;
    const user = userEvent.setup();
    render(<MemberSearchLink onSelect={vi.fn()} onClear={vi.fn()} />, { wrapper });
    await user.type(screen.getByLabelText(/Find an existing person/), 'ad');
    expect(await screen.findByText(/Searching…/)).toBeInTheDocument();
  });

  it('shows a no-matches hint when the term yields nothing', async () => {
    searchResults = [];
    const user = userEvent.setup();
    render(<MemberSearchLink onSelect={vi.fn()} onClear={vi.fn()} />, { wrapper });
    await user.type(screen.getByLabelText(/Find an existing person/), 'zz');
    expect(
      await screen.findByText(/No matches — a new contact will be created\./),
    ).toBeInTheDocument();
  });

  it('clicking a result calls onSelect with that member', async () => {
    const onSelect = vi.fn();
    searchResults = [
      { id: 'm-9', firstName: 'Ada', lastName: 'Lovelace', phone: '0700', memberType: 'member' },
    ];
    const user = userEvent.setup();
    render(<MemberSearchLink onSelect={onSelect} onClear={vi.fn()} />, { wrapper });

    await user.type(screen.getByLabelText(/Find an existing person/), 'ada');
    await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      id: 'm-9',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: '0700',
      memberType: 'member',
    });
  });

  it('clicking the clear button calls onClear', async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    render(<MemberSearchLink value="m-9" onSelect={vi.fn()} onClear={onClear} />, { wrapper });

    await user.click(screen.getByRole('button', { name: /Clear search/ }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('renders the linked note when value (subjectMemberId) is set', () => {
    render(
      <MemberSearchLink
        value="m-9"
        onSelect={vi.fn()}
        onClear={vi.fn()}
        linkedNote="Linked to an existing person."
      />,
      { wrapper },
    );
    expect(screen.getByText('Linked to an existing person.')).toBeInTheDocument();
  });

  it('disables the input + clear and shows the disabledHint when disabled', () => {
    render(
      <MemberSearchLink
        value="m-9"
        disabled
        disabledHint="An anonymous testimony won’t be linked."
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByLabelText(/Find an existing person/)).toBeDisabled();
    // The clear button is not rendered while disabled.
    expect(screen.queryByRole('button', { name: /Clear search/ })).not.toBeInTheDocument();
    expect(screen.getByText('An anonymous testimony won’t be linked.')).toBeInTheDocument();
    // The linked note is suppressed while disabled.
    expect(screen.queryByText(/Linked to an existing person/)).not.toBeInTheDocument();
    // The query hook is disabled.
    expect((lastSearchCall!.options as { enabled: boolean }).enabled).toBe(false);
  });
});
