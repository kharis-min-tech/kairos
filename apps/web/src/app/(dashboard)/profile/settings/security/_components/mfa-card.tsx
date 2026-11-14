'use client';

import { useState } from 'react';
import { KeyRound, ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@kairos/ui';
import { useDisableMfa, useMfaStatus, useRegenerateBackupCodes } from '@/hooks/use-mfa';
import { MfaEnrolment } from '@/components/mfa/mfa-enrolment';
import { BackupCodesPanel } from '@/components/mfa/backup-codes-panel';

/** Below this, the member is close enough to locked out to be told. */
const LOW_BACKUP_CODES = 3;

type PasswordAction = 'disable' | 'regenerate' | null;

/**
 * Two-step sign-in, from the member's own settings.
 *
 * The card reads two independent facts, `enrolled` and `required`, and all
 * four combinations are real: a leader who must have it and does not yet, a
 * member who turned it on without being asked, and so on. It never says
 * "required" to someone it is not required of.
 *
 * Both destructive actions re-ask for the password. That is the API's rule,
 * not this card's: removing a second factor from a session someone else has
 * borrowed is exactly what that someone wants to do.
 */
export function MfaCard() {
  const { data: status, isLoading, isError, error } = useMfaStatus();
  const disable = useDisableMfa();
  const regenerate = useRegenerateBackupCodes();

  const [enrolling, setEnrolling] = useState(false);
  const [passwordAction, setPasswordAction] = useState<PasswordAction>(null);
  const [password, setPassword] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);

  function openPasswordDialog(action: Exclude<PasswordAction, null>) {
    setPassword('');
    setDialogError(null);
    setPasswordAction(action);
  }

  async function submitPasswordAction() {
    setDialogError(null);
    if (!password) {
      setDialogError('Enter your password to confirm.');
      return;
    }
    try {
      if (passwordAction === 'disable') {
        await disable.mutateAsync({ currentPassword: password });
        setPasswordAction(null);
        toast.success('Two-step sign-in is off. You can turn it back on whenever you like.');
      } else {
        const result = await regenerate.mutateAsync({ currentPassword: password });
        setPasswordAction(null);
        setFreshCodes(result.backupCodes);
      }
      setPassword('');
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'That did not work. Please try again.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Two-step sign-in
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          A 6-digit code from your phone, on top of your password.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Couldn&apos;t load your two-step settings:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}

        {/* A fresh set of backup codes, shown once and then gone. */}
        {freshCodes && (
          <BackupCodesPanel
            codes={freshCodes}
            onAcknowledge={() => setFreshCodes(null)}
            acknowledgeLabel="Done, I have saved them"
          />
        )}

        {status && !freshCodes && !enrolling && (
          <div className="space-y-4">
            {status.enrolled ? (
              <>
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" aria-hidden /> On. We ask for a code when you
                  sign in.
                </p>

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <p>
                    {status.backupCodesRemaining} backup{' '}
                    {status.backupCodesRemaining === 1 ? 'code' : 'codes'} left.
                    {status.backupCodesRemaining <= LOW_BACKUP_CODES && (
                      <>
                        {' '}
                        <span className="font-medium text-[#b07d12]">
                          Worth getting a new set before you run out. Running out with a lost
                          phone means asking an administrator to let you back in.
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPasswordDialog('regenerate')}
                  >
                    New backup codes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => openPasswordDialog('disable')}
                  >
                    Turn off
                  </Button>
                </div>
              </>
            ) : (
              <>
                {status.required ? (
                  <div className="flex items-start gap-2 rounded-lg bg-[#f8b537]/10 p-3 text-sm">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#b07d12]" aria-hidden />
                    <p className="leading-relaxed">
                      Your role can see other people&apos;s personal details, so two-step sign-in
                      will be required before long. Setting it up now means it will not interrupt
                      you later.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Not on. If someone learns your password, it is all they need. A second step
                    takes a minute to set up and stops that.
                  </p>
                )}

                {status.pendingEnrolment && (
                  <p className="text-xs text-muted-foreground">
                    You started setting this up and did not finish. Starting again gives you a
                    fresh code to scan.
                  </p>
                )}

                <Button
                  onClick={() => setEnrolling(true)}
                  className="bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-95"
                >
                  Set up two-step sign-in
                </Button>
              </>
            )}
          </div>
        )}

        {enrolling && (
          <MfaEnrolment
            onComplete={() => {
              setEnrolling(false);
              toast.success('Two-step sign-in is on.');
            }}
            onCancel={() => setEnrolling(false)}
          />
        )}
      </CardContent>

      <Dialog open={passwordAction !== null} onOpenChange={(open) => !open && setPasswordAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {passwordAction === 'disable' ? 'Turn off two-step sign-in?' : 'New backup codes'}
            </DialogTitle>
            <DialogDescription>
              {passwordAction === 'disable'
                ? 'Your password alone will get into your account again. Enter it to confirm this is you.'
                : 'Your current backup codes stop working as soon as the new ones appear. Enter your password to confirm.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="mfa-password">Your password</Label>
            <Input
              id="mfa-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {dialogError && (
              <p role="alert" className="text-xs text-destructive">
                {dialogError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPasswordAction(null)}>
              Cancel
            </Button>
            <Button
              variant={passwordAction === 'disable' ? 'destructive' : 'default'}
              onClick={submitPasswordAction}
              disabled={disable.isPending || regenerate.isPending}
            >
              {passwordAction === 'disable' ? 'Turn it off' : 'Generate new codes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
