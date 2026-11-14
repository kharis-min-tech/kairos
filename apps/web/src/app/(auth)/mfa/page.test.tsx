import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const replace = vi.fn();
const persistAuthSuccess = vi.fn();
const verifyMutate = vi.fn();
const startChallengeMutate = vi.fn();
const confirmChallengeMutate = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock('@/hooks/use-auth', () => ({
  persistAuthSuccess: (args: unknown) => persistAuthSuccess(args),
}));

vi.mock('@/hooks/use-mfa', () => ({
  useVerifyMfaChallenge: () => ({ mutateAsync: verifyMutate, isPending: false }),
  useStartMfaEnrolment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStartChallengeEnrolment: () => ({ mutateAsync: startChallengeMutate, isPending: false }),
  useConfirmMfaEnrolment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useConfirmChallengeEnrolment: () => ({ mutateAsync: confirmChallengeMutate, isPending: false }),
}));

import MfaPage from './page';
import { useMfaChallengeStore } from '@/stores/mfa-challenge-store';

const member = {
  id: 'm-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  systemRole: 'member',
  mustChangePassword: false,
};

const session = {
  tokens: { accessToken: 'at', refreshToken: 'rt' },
  member,
  mfaMethod: 'totp',
  backupCodesRemaining: 9,
};

beforeEach(() => {
  replace.mockReset();
  persistAuthSuccess.mockReset();
  verifyMutate.mockReset();
  startChallengeMutate.mockReset().mockResolvedValue({
    secretBase32: 'JBSWY3DPEHPK3PXP',
    enrolmentUri: 'otpauth://totp/Kairos:ada@example.com?secret=JBSWY3DPEHPK3PXP',
  });
  confirmChallengeMutate.mockReset();
  useMfaChallengeStore.getState().clear();
});

function challengeIsOutstanding(stage: 'challenge' | 'enrolment' = 'challenge', returnTo?: string) {
  useMfaChallengeStore.getState().start({ token: 'pre-mfa', stage, returnTo: returnTo ?? null });
}

describe('MfaPage - no challenge in memory', () => {
  /**
   * The token is deliberately not persisted, so a refresh empties the store.
   * That is the designed behaviour and the page has to explain it rather than
   * render an input that cannot work.
   */
  it('explains the restart instead of showing a dead code field', () => {
    render(<MfaPage />);
    expect(screen.queryByLabelText(/6-digit code/i)).toBeNull();
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeDefined();
  });
});

describe('MfaPage - challenge stage', () => {
  it('verifies the code, persists the session and leaves /mfa', async () => {
    challengeIsOutstanding();
    verifyMutate.mockResolvedValue(session);

    render(<MfaPage />);
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() =>
      expect(verifyMutate).toHaveBeenCalledWith({ code: '123456', token: 'pre-mfa' }),
    );
    expect(persistAuthSuccess).toHaveBeenCalledWith({
      tokens: { accessToken: 'at', refreshToken: 'rt' },
      member,
      activeRole: 'member',
    });
    expect(replace).toHaveBeenCalledWith('/dashboard');
  });

  it('returns the member to where they were headed', async () => {
    challengeIsOutstanding('challenge', '/members');
    verifyMutate.mockResolvedValue(session);

    render(<MfaPage />);
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/members'));
  });

  it('routes a member who must change their password there first', async () => {
    challengeIsOutstanding('challenge', '/members');
    verifyMutate.mockResolvedValue({
      ...session,
      member: { ...member, mustChangePassword: true },
    });

    render(<MfaPage />);
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/change-password'));
  });

  it('clears the pre-MFA token once it has been spent', async () => {
    challengeIsOutstanding();
    verifyMutate.mockResolvedValue(session);

    render(<MfaPage />);
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(useMfaChallengeStore.getState().token).toBeNull());
  });

  /**
   * A wrong code is a 401. The member must stay on this page with the
   * challenge intact: bouncing them to /login would make a typo cost them
   * their password as well as their code.
   */
  it('keeps the challenge alive when the code is rejected', async () => {
    challengeIsOutstanding();
    verifyMutate.mockRejectedValue(new Error('That code is not right.'));

    render(<MfaPage />);
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '000000');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('That code is not right.');
    expect(replace).not.toHaveBeenCalled();
    expect(persistAuthSuccess).not.toHaveBeenCalled();
    expect(useMfaChallengeStore.getState().token).toBe('pre-mfa');
  });

  it('empties the field after a rejection so the next attempt starts clean', async () => {
    challengeIsOutstanding();
    verifyMutate.mockRejectedValue(new Error('That code is not right.'));

    render(<MfaPage />);
    const field = screen.getByLabelText(/6-digit code/i) as HTMLInputElement;
    await userEvent.type(field, '000000');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await screen.findByRole('alert');
    expect(field.value).toBe('');
  });

  it('does not call the API for an obviously short code', async () => {
    challengeIsOutstanding();

    render(<MfaPage />);
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await screen.findByRole('alert');
    expect(verifyMutate).not.toHaveBeenCalled();
  });

  /**
   * Backup codes are alphanumeric. The numeric input mode that suits a TOTP
   * code gives a phone keypad with no letters on it, so the member could not
   * type one at all.
   */
  it('switches the field to a backup code, letters and all', async () => {
    challengeIsOutstanding();

    render(<MfaPage />);
    await userEvent.click(screen.getByRole('button', { name: /cannot reach my authenticator/i }));

    const field = screen.getByLabelText(/backup code/i);
    expect(field.getAttribute('inputmode')).toBe('text');
  });

  it('sends a backup code to the same endpoint, untouched', async () => {
    challengeIsOutstanding();
    verifyMutate.mockResolvedValue({ ...session, mfaMethod: 'backup-code' });

    render(<MfaPage />);
    await userEvent.click(screen.getByRole('button', { name: /cannot reach my authenticator/i }));
    await userEvent.type(screen.getByLabelText(/backup code/i), 'ABCDE-FGHIJ');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() =>
      expect(verifyMutate).toHaveBeenCalledWith({ code: 'ABCDE-FGHIJ', token: 'pre-mfa' }),
    );
  });
});

describe('MfaPage - enrolment stage', () => {
  it('shows the setup steps rather than a code field', async () => {
    challengeIsOutstanding('enrolment');

    render(<MfaPage />);
    await waitFor(() => expect(startChallengeMutate).toHaveBeenCalledWith('pre-mfa'));
    expect(await screen.findByTestId('mfa-setup-key')).toBeDefined();
  });

  /**
   * Confirming enrolment IS proving a factor, so the server signs them in
   * with the same call. If this page ignored that session the member would
   * finish setup and land back at the login screen.
   */
  it('signs the member in from the confirm response, after they save the codes', async () => {
    challengeIsOutstanding('enrolment');
    confirmChallengeMutate.mockResolvedValue({
      backupCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'],
      tokens: { accessToken: 'at', refreshToken: 'rt' },
      member,
    });

    render(<MfaPage />);
    await screen.findByTestId('mfa-setup-key');
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /turn on two-step sign-in/i }));

    // The codes come first. Nothing is persisted until they acknowledge them.
    expect(await screen.findByText('AAAAA-BBBBB')).toBeDefined();
    expect(persistAuthSuccess).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /i have saved them/i }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(persistAuthSuccess).toHaveBeenCalled();
  });
});
