'use client';

import { useState } from 'react';
import { Check, Copy, Download, KeyRound } from 'lucide-react';
import { Button } from '@kairos/ui';

/**
 * The backup codes, shown once.
 *
 * "Once" is the whole design constraint. The server stores only SHA-256
 * hashes, so this screen is the single moment the plaintext exists anywhere
 * the member can reach. Everything here exists to stop them closing it
 * without saving: copy and download are one click each, and the acknowledge
 * button says what it is acknowledging rather than "OK".
 *
 * No auto-dismiss, no timeout. A member reading slowly is not a threat.
 */
export function BackupCodesPanel({
  codes,
  onAcknowledge,
  acknowledgeLabel = 'I have saved my backup codes',
}: {
  codes: string[];
  onAcknowledge: () => void;
  acknowledgeLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  const asText = [
    'Kairos backup codes',
    '',
    'Each code works once. Keep them somewhere only you can reach,',
    'and not on the phone that holds your authenticator app.',
    '',
    ...codes,
    '',
  ].join('\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, or the member said no). The
      // codes are on screen and downloadable, so this is not worth an error.
    }
  }

  function download() {
    const blob = new Blob([asText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kairos-backup-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg bg-[#f8b537]/10 p-3 text-sm">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#b07d12]" aria-hidden />
        <p className="leading-relaxed">
          Save these now. They are shown once and we cannot show them again. Each one works a
          single time, and they are how you get back in if you lose your phone.
        </p>
      </div>

      <ul
        aria-label="Backup codes"
        className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-4 font-mono text-sm"
      >
        {codes.map((code) => (
          <li key={code} className="tracking-wider">
            {code}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={copy}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? 'Copied' : 'Copy codes'}
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={download}>
          <Download className="h-4 w-4" aria-hidden /> Download as a file
        </Button>
      </div>

      <Button
        type="button"
        onClick={onAcknowledge}
        className="bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] text-white hover:opacity-95"
      >
        {acknowledgeLabel}
      </Button>
    </div>
  );
}
