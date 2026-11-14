import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const disableMutate = vi.fn();
const regenerateMutate = vi.fn();
const startMutate = vi.fn();
const confirmMutate = vi.fn();
const success = vi.fn();

let status: Record<string, unknown> | undefined;
let isLoading = false;

vi.mock('sonner', () => ({ toast: { success: (m: string) => success(m), error: vi.fn() } }));

vi.mock('@/hooks/use-mfa', () => ({
  useMfaStatus: () => ({ data: status, isLoading, isError: false, error: null }),
  useDisableMfa: () => ({ mutateAsync: disableMutate, isPending: false }),
  useRegenerateBackupCodes: () => ({ mutateAsync: regenerateMutate, isPending: false }),
  useStartMfaEnrolment: () => ({ mutateAsync: startMutate, isPending: false }),
  useStartChallengeEnrolment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useConfirmMfaEnrolment: () => ({ mutateAsync: confirmMutate, isPending: false }),
  useConfirmChallengeEnrolment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { MfaCard } from './mfa-card';

beforeEach(() => {
  disableMutate.mockReset().mockResolvedValue({});
  regenerateMutate.mockReset();
  startMutate.mockReset().mockResolvedValue({
    secretBase32: 'JBSWY3DPEHPK3PXP',
    enrolmentUri: 'otpauth://totp/Kairos:ada@example.com?secret=JBSWY3DPEHPK3PXP',
  });
  confirmMutate.mockReset();
  success.mockReset();
  isLoading = false;
});

/**
 * `enrolled` and `required` are independent, and all four combinations happen.
 * The card must never tell an ordinary member that something is required of
 * them, and must never stay silent at a leader who has not set it up.
 */
describe('MfaCard - what it says to whom', () => {
  it('nags a privileged member who has no factor', () => {
    status = { enrolled: false, pendingEnrolment: false, required: true, backupCodesRemaining: 0 };
    render(<MfaCard />);
    expect(screen.getByText(/will be required before long/i)).toBeDefined();
  });

  it('offers it to an ordinary member without claiming it is required', () => {
    status = { enrolled: false, pendingEnrolment: false, required: false, backupCodesRemaining: 0 };
    render(<MfaCard />);
    expect(screen.queryByText(/required/i)).toBeNull();
    expect(screen.getByRole('button', { name: /set up two-step sign-in/i })).toBeDefined();
  });

  it('names an abandoned setup so a stale QR is not a mystery', () => {
    status = { enrolled: false, pendingEnrolment: true, required: true, backupCodesRemaining: 0 };
    render(<MfaCard />);
    expect(screen.getByText(/did not finish/i)).toBeDefined();
  });

  it('reports how many backup codes are left', () => {
    status = { enrolled: true, pendingEnrolment: false, required: true, backupCodesRemaining: 8 };
    render(<MfaCard />);
    expect(screen.getByText(/8 backup codes left/i)).toBeDefined();
  });

  it('warns when the codes are nearly gone, not only when they are', () => {
    status = { enrolled: true, pendingEnrolment: false, required: true, backupCodesRemaining: 2 };
    render(<MfaCard />);
    expect(screen.getByText(/before you run out/i)).toBeDefined();
  });

  it('does not warn while there are plenty', () => {
    status = { enrolled: true, pendingEnrolment: false, required: true, backupCodesRemaining: 9 };
    render(<MfaCard />);
    expect(screen.queryByText(/before you run out/i)).toBeNull();
  });
});

describe('MfaCard - turning it off', () => {
  beforeEach(() => {
    status = { enrolled: true, pendingEnrolment: false, required: true, backupCodesRemaining: 9 };
  });

  it('asks for the password first and does not call the API on the button alone', async () => {
    render(<MfaCard />);
    await userEvent.click(screen.getByRole('button', { name: /turn off/i }));
    expect(disableMutate).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/your password/i)).toBeDefined();
  });

  it('refuses an empty password without troubling the server', async () => {
    render(<MfaCard />);
    await userEvent.click(screen.getByRole('button', { name: /turn off/i }));
    await userEvent.click(screen.getByRole('button', { name: /turn it off/i }));
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(disableMutate).not.toHaveBeenCalled();
  });

  it('sends the password through when it is given', async () => {
    render(<MfaCard />);
    await userEvent.click(screen.getByRole('button', { name: /turn off/i }));
    await userEvent.type(screen.getByLabelText(/your password/i), 'hunter2');
    await userEvent.click(screen.getByRole('button', { name: /turn it off/i }));

    await waitFor(() =>
      expect(disableMutate).toHaveBeenCalledWith({ currentPassword: 'hunter2' }),
    );
  });

  /**
   * A wrong password is the common case here, not an edge case: this dialog
   * is reached by someone who has lost their phone and is already flustered.
   * The dialog has to stay open with the server's own words in it.
   */
  it('keeps the dialog open and shows why when the password is wrong', async () => {
    disableMutate.mockRejectedValue(new Error('That password is not correct.'));
    render(<MfaCard />);
    await userEvent.click(screen.getByRole('button', { name: /turn off/i }));
    await userEvent.type(screen.getByLabelText(/your password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /turn it off/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('That password is not correct.');
    expect(screen.getByLabelText(/your password/i)).toBeDefined();
  });
});

describe('MfaCard - new backup codes', () => {
  beforeEach(() => {
    status = { enrolled: true, pendingEnrolment: false, required: true, backupCodesRemaining: 2 };
  });

  it('shows the new codes once, after the password', async () => {
    regenerateMutate.mockResolvedValue({ backupCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] });
    render(<MfaCard />);
    await userEvent.click(screen.getByRole('button', { name: /new backup codes/i }));
    await userEvent.type(screen.getByLabelText(/your password/i), 'hunter2');
    await userEvent.click(screen.getByRole('button', { name: /generate new codes/i }));

    expect(await screen.findByText('AAAAA-BBBBB')).toBeDefined();
    expect(screen.getByText('CCCCC-DDDDD')).toBeDefined();
  });

  it('says plainly that the old codes stop working', async () => {
    render(<MfaCard />);
    await userEvent.click(screen.getByRole('button', { name: /new backup codes/i }));
    expect(screen.getByText(/stop working as soon as the new ones appear/i)).toBeDefined();
  });
});

describe('MfaCard - setting it up', () => {
  it('starts enrolment and shows a key that can be typed, not only scanned', async () => {
    status = { enrolled: false, pendingEnrolment: false, required: true, backupCodesRemaining: 0 };
    render(<MfaCard />);
    await userEvent.click(screen.getByRole('button', { name: /set up two-step sign-in/i }));

    await waitFor(() => expect(startMutate).toHaveBeenCalled());
    expect((await screen.findByTestId('mfa-setup-key')).textContent).toBe('JBSWY3DPEHPK3PXP');
  });

  it('holds the member on the backup codes before declaring success', async () => {
    status = { enrolled: false, pendingEnrolment: false, required: true, backupCodesRemaining: 0 };
    confirmMutate.mockResolvedValue({ backupCodes: ['AAAAA-BBBBB'] });

    render(<MfaCard />);
    await userEvent.click(screen.getByRole('button', { name: /set up two-step sign-in/i }));
    await screen.findByTestId('mfa-setup-key');
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /turn on two-step sign-in/i }));

    expect(await screen.findByText('AAAAA-BBBBB')).toBeDefined();
    expect(success).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /i have saved my backup codes/i }));
    await waitFor(() => expect(success).toHaveBeenCalled());
  });

  it('surfaces a rejected code without losing the setup key', async () => {
    status = { enrolled: false, pendingEnrolment: false, required: true, backupCodesRemaining: 0 };
    confirmMutate.mockRejectedValue(new Error('That code did not match.'));

    render(<MfaCard />);
    await userEvent.click(screen.getByRole('button', { name: /set up two-step sign-in/i }));
    await screen.findByTestId('mfa-setup-key');
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '000000');
    await userEvent.click(screen.getByRole('button', { name: /turn on two-step sign-in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('That code did not match.');
    expect(screen.getByTestId('mfa-setup-key')).toBeDefined();
    expect(startMutate).toHaveBeenCalledTimes(1);
  });
});
