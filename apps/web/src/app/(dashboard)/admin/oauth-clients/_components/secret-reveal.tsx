'use client';

import { KeyRound } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import { CopyField } from './copy-field';

/**
 * The one moment a client secret is visible. The server keeps only a hash, so
 * if this is dismissed unread the only remedy is rotating to a new secret —
 * the copy says so, plainly, rather than burying it.
 */
export function SecretReveal({
  clientId,
  clientSecret,
  onDone,
}: {
  clientId: string;
  clientSecret: string | null;
  onDone: () => void;
}) {
  return (
    <Card className="border-[#f8b537]/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-[#f8b537]" aria-hidden />
          {clientSecret ? 'Copy the client secret now' : 'App registered'}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {clientSecret
            ? "This is the only time it will be shown. Kairos stores a one-way hash, so it can't be recovered. If it's lost, rotate to a new one."
            : 'This is a public client, so it has no secret. It relies on PKCE alone.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <CopyField label="Client ID" value={clientId} />
        {clientSecret && <CopyField label="Client secret" value={clientSecret} />}
        <Button onClick={onDone}>{clientSecret ? "I've saved it" : 'Done'}</Button>
      </CardContent>
    </Card>
  );
}
