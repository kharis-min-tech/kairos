import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { GiftAidDeclaration } from '@kairos/types';
import GiftAidSettingsPage from './page';

// ── Mocks ─────────────────────────────────────────────────

let active: GiftAidDeclaration | null = null;
let history: GiftAidDeclaration[] = [];
const declareMutate = vi.fn();
const withdrawMutate = vi.fn();

vi.mock('@/hooks/use-gift-aid', () => ({
  useMyGiftAid: () => ({
    data: { active, history, canDeclare: !active },
    isLoading: false,
    isError: false,
  }),
  useGiftAidDeclarationText: () => ({
    data: {
      charityName: 'Kharis Ministries',
      charityNumber: '1139291',
      wordingVersion: '2026-10-v1',
      coverageLabels: {
        past_and_future: 'This gift, the past 4 years, and all future gifts',
        future: 'This gift and all future gifts',
        single: 'One gift only',
      },
      texts: { past_and_future: 'I want to Gift Aid...', future: 'I want to Gift Aid...' },
      notes: 'Kharis Ministries is a registered charity, number 1139291.',
    },
  }),
  useDeclareGiftAid: () => ({ mutateAsync: declareMutate, isPending: false, isError: false }),
  useWithdrawGiftAid: () => ({ mutateAsync: withdrawMutate, isPending: false, isError: false }),
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({
      user: {
        firstName: 'Ade',
        lastName: 'Bolarinwa',
        email: 'ade@example.com',
        address: '12 High Street',
        city: 'London',
        postalCode: 'SE1 2AB',
        phone: null,
      },
    }),
}));

function declaration(over: Partial<GiftAidDeclaration> = {}): GiftAidDeclaration {
  return {
    id: 'd1',
    memberId: 'm1',
    branchId: 'b1',
    title: 'Mr',
    firstName: 'Ade',
    lastName: 'Bolarinwa',
    addressLine1: '12 High Street',
    addressLine2: null,
    city: 'London',
    postcode: 'SE1 2AB',
    countryCode: 'GB',
    email: 'ade@example.com',
    phone: null,
    coverage: 'past_and_future',
    coversFrom: '2022-10-30',
    singleGiftDescription: null,
    channel: 'online',
    wordingVersion: '2026-10-v1',
    declarationText: 'I want to Gift Aid...',
    evidenceUrl: null,
    declaredAt: '2026-10-30T10:00:00.000Z',
    capturedById: null,
    status: 'active',
    cancelledAt: null,
    cancellationMethod: null,
    cancellationNotes: null,
    supersededById: null,
    retentionReviewAt: null,
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
    ...over,
  };
}

beforeEach(() => {
  active = null;
  history = [];
  declareMutate.mockReset();
  withdrawMutate.mockReset();
});

describe('Gift Aid profile settings', () => {
  it('offers a declaration when none is in place', () => {
    render(<GiftAidSettingsPage />);
    expect(screen.getByText(/You have no Gift Aid declaration in place/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Make a Gift Aid declaration/ }),
    ).toBeInTheDocument();
  });

  it('shows the declaration in force with the name and address as declared', () => {
    active = declaration();
    render(<GiftAidSettingsPage />);
    expect(screen.getByText(/In place since 30 October 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Mr Ade Bolarinwa/)).toBeInTheDocument();
    expect(screen.getByText(/12 High Street, London, SE1 2AB/)).toBeInTheDocument();
  });

  it('tells the donor a withdrawal is prospective before they confirm it', () => {
    active = declaration();
    render(<GiftAidSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Withdraw/ }));

    expect(
      screen.getByText(/Gift Aid will stop on gifts you make from today/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Anything already claimed on your earlier giving is unaffected/),
    ).toBeInTheDocument();
  });

  it('withdraws with the donor note attached', async () => {
    active = declaration();
    render(<GiftAidSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Withdraw/ }));
    fireEvent.change(screen.getByPlaceholderText(/Anything you'd like us to note/), {
      target: { value: 'Retired, no longer paying tax' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Yes, withdraw it/ }));

    await waitFor(() =>
      expect(withdrawMutate).toHaveBeenCalledWith({ notes: 'Retired, no longer paying tax' }),
    );
  });

  it('explains that updating replaces rather than edits', () => {
    active = declaration();
    render(<GiftAidSettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Update my details/ }));
    expect(screen.getByText(/A declaration cannot be edited in place/)).toBeInTheDocument();
  });

  it('lists earlier declarations and says why they are kept', () => {
    active = null;
    history = [
      declaration({
        id: 'd0',
        status: 'cancelled',
        cancelledAt: '2026-09-01T00:00:00.000Z',
        cancellationNotes: 'Stopped paying tax',
      }),
    ];
    render(<GiftAidSettingsPage />);
    expect(screen.getByText(/Withdrawn on 1 September 2026/)).toBeInTheDocument();
    expect(
      screen.getByText(/not removed if you ask us to delete your profile/),
    ).toBeInTheDocument();
  });
});
