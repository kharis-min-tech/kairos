'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button, Input, Label } from '@kairos/ui';
import type { MfaConfirmResponse, MfaEnrolmentStart } from '@kairos/types';
import {
  useConfirmChallengeEnrolment,
  useConfirmMfaEnrolment,
  useStartChallengeEnrolment,
  useStartMfaEnrolment,
} from '@/hooks/use-mfa';
import { BackupCodesPanel } from './backup-codes-panel';

/**
 * Setting up an authenticator, start to finish.
 *
 * One component for both doors. A member turning MFA on from settings and a
 * leader the cutover has caught mid-sign-in see exactly the same three steps;
 * the only difference is which credential the calls carry, which is what
 * `challengeToken` selects. Writing it twice would have meant two versions of
 * the backup-code warning, and one of them going stale.
 *
 * Enrolment begins on mount rather than behind a button, because the parent
 * has already asked. The secret it creates is worthless until confirmed, and
 * `beginEnrolment` refuses to overwrite a factor that is already proved, so
 * an abandoned attempt costs nothing.
 */
export function MfaEnrolment({
  challengeToken,
  onComplete,
  onCancel,
}: {
  /** Present when the caller has no session yet, only a pre-MFA token. */
  challengeToken?: string;
  onComplete: (result: MfaConfirmResponse) => void;
  onCancel?: () => void;
}) {
  const startSession = useStartMfaEnrolment();
  const startChallenge = useStartChallengeEnrolment();
  const confirmSession = useConfirmMfaEnrolment();
  const confirmChallenge = useConfirmChallengeEnrolment();

  const [enrolment, setEnrolment] = useState<MfaEnrolmentStart | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [result, setResult] = useState<MfaConfirmResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startFailed, setStartFailed] = useState(false);
  const started = useRef(false);

  async function begin() {
    setError(null);
    setStartFailed(false);
    try {
      const data = challengeToken
        ? await startChallenge.mutateAsync(challengeToken)
        : await startSession.mutateAsync();
      setEnrolment(data);
    } catch (err) {
      setStartFailed(true);
      setError(err instanceof Error ? err.message : 'Could not start setup. Please try again.');
    }
  }

  useEffect(() => {
    // Strict mode double-invokes effects in dev, and starting twice would
    // generate two secrets and draw a QR for whichever lost the race.
    if (started.current) return;
    started.current = true;
    void begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enrolment) return;
    QRCode.toDataURL(enrolment.enrolmentUri, { margin: 1, width: 220 })
      .then(setQrDataUrl)
      .catch(() => {
        // No QR. Not fatal, and not worth an error message: the setup key
        // below is always on screen and is the same secret, typed instead of
        // scanned. This is also the path in jsdom, which has no canvas.
        setQrDataUrl(null);
      });
  }, [enrolment]);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.replace(/\s/g, '');
    if (trimmed.length < 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    try {
      const confirmed = challengeToken
        ? await confirmChallenge.mutateAsync({ code: trimmed, token: challengeToken })
        : await confirmSession.mutateAsync({ code: trimmed });
      setResult(confirmed);
      setCodes(confirmed.backupCodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.');
      setCode('');
    }
  }

  const confirming = confirmSession.isPending || confirmChallenge.isPending;
  const starting = startSession.isPending || startChallenge.isPending;

  if (codes && result) {
    return (
      <BackupCodesPanel
        codes={codes}
        onAcknowledge={() => onComplete(result)}
        acknowledgeLabel={
          challengeToken ? 'I have saved them, continue to Kairos' : 'I have saved my backup codes'
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <ol className="space-y-5">
        <li className="space-y-2">
          <p className="text-sm font-medium">
            1. Install an authenticator app, if you do not have one
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Google Authenticator, Microsoft Authenticator and 1Password all work. Any app that
            makes 6-digit codes will do.
          </p>
        </li>

        <li className="space-y-3">
          <p className="text-sm font-medium">2. Add Kairos to it</p>

          {starting && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Preparing your setup code
            </div>
          )}

          {startFailed && (
            <Button type="button" variant="outline" size="sm" onClick={() => void begin()}>
              Try again
            </Button>
          )}

          {enrolment && (
            <div className="space-y-3">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR code to add Kairos to your authenticator app"
                  width={220}
                  height={220}
                  className="rounded-lg border bg-white p-2"
                />
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {qrDataUrl
                    ? 'Reading this on the same phone? Type this key into the app instead of scanning.'
                    : 'Type this key into your authenticator app.'}
                </p>
                <p
                  className="select-all break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm tracking-wider"
                  data-testid="mfa-setup-key"
                >
                  {enrolment.secretBase32}
                </p>
              </div>
            </div>
          )}
        </li>

        <li className="space-y-2">
          <p className="text-sm font-medium">3. Enter the code it shows you</p>
          <form onSubmit={submitCode} className="space-y-3">
            <div className="space-y-1.5 sm:max-w-[14rem]">
              <Label htmlFor="mfa-enrol-code">6-digit code</Label>
              <Input
                id="mfa-enrol-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={7}
                className="font-mono tracking-[0.3em]"
                disabled={!enrolment || confirming}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={!enrolment || confirming}
                className="gap-1.5 bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-95"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden />
                {confirming ? 'Checking' : 'Turn on two-step sign-in'}
              </Button>
              {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel} disabled={confirming}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </li>
      </ol>
    </div>
  );
}
