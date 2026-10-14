'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@kairos/ui';

/** A read-only value with a copy button — for client IDs, secrets and endpoint URLs. */
export function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.');
    }
  }
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code
          className={`min-w-0 flex-1 truncate rounded-md border border-muted-foreground/15 bg-muted/40 px-3 py-2 text-xs ${mono ? 'font-mono' : ''}`}
          title={value}
        >
          {value}
        </code>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1" onClick={copy} aria-label={`Copy ${label}`}>
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
      </div>
    </div>
  );
}
