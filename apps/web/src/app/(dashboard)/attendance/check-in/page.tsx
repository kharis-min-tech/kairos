'use client';

export const runtime = 'edge';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Check, Clock, ScanLine } from 'lucide-react';
import { Button, Card, CardContent } from '@kairos/ui';
import { formatShortDate } from '@kairos/core';
import type { SelfCheckInCandidate, SelfCheckInResult } from '@kairos/types';
import {
  useSelfCheckInCandidates,
  useSelfCheckIn,
  useSelfCheckInQr,
} from '@/hooks/use-attendance';
import { QrScannerModal } from '@/components/qr-scanner-modal';

function formatServiceTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** Parse a member check-in QR (`kairos://check-in/{serviceId}/{token}`). */
function parseCheckInQr(payload: string): { serviceId: string; token: string } | null {
  const prefix = 'kairos://check-in/';
  if (!payload.startsWith(prefix)) return null;
  const rest = payload.slice(prefix.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const serviceId = rest.slice(0, slash);
  const token = rest.slice(slash + 1);
  if (!serviceId || !token) return null;
  return { serviceId, token };
}

/**
 * Member self-check-in page. Web parity for the mobile Check-in tab. Two paths:
 *   1. "I'm here" per open service — honour-system, hits `selfCheckIn`.
 *   2. "Scan QR" — opens the browser scanner, decodes the rotating admin QR,
 *      hits `selfCheckInQr` which verifies the HMAC then defers to the same
 *      window-math core.
 *
 * Non-open services are still rendered but disabled with an explainer so the
 * page never looks empty when there's a service today. See docs/self-check-in.md
 * for the full lifecycle.
 */
export default function SelfCheckInPage() {
  const candidates = useSelfCheckInCandidates();
  const checkIn = useSelfCheckIn();
  const checkInQr = useSelfCheckInQr();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [result, setResult] = useState<SelfCheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows: SelfCheckInCandidate[] = useMemo(() => candidates.data ?? [], [candidates.data]);
  const openRows = useMemo(() => rows.filter((r) => r.status === 'open'), [rows]);
  const openingSoonRows = useMemo(() => rows.filter((r) => r.status === 'opens-soon'), [rows]);
  const closedRows = useMemo(() => rows.filter((r) => r.status === 'closed'), [rows]);
  const canCheckIn = openRows.length > 0;

  async function handleTapCheckIn(serviceId: string) {
    setError(null);
    setResult(null);
    try {
      const r = await checkIn.mutateAsync(serviceId);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed. Please try again.');
    }
  }

  async function handleScannedQr(payload: string) {
    setScannerOpen(false);
    const parsed = parseCheckInQr(payload);
    if (!parsed) {
      setError("That QR isn't a Kairos check-in code.");
      return;
    }
    setError(null);
    setResult(null);
    try {
      const r = await checkInQr.mutateAsync(parsed);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed. Please try again.');
    }
  }

  const pending = checkIn.isPending || checkInQr.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/attendance"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to attendance
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Check in</h1>
        <p className="text-sm text-muted-foreground">
          Tap once to record yourself at a service, or scan the QR displayed at the admin desk.
        </p>
      </div>

      {/* Success + error banners */}
      {result ? (
        <div
          role="status"
          className="rounded-xl bg-gradient-to-r from-[#451ebb] to-[#5d3fd3] px-5 py-4 text-white shadow-sm"
        >
          <p className="text-sm font-semibold">
            {result.alreadyCheckedIn
              ? "You're already checked in"
              : result.status === 'Late'
                ? "You're checked in, marked Late"
                : "You're in"}
          </p>
          <p className="mt-1 text-sm text-white/80">
            {result.alreadyCheckedIn
              ? `Recorded as ${result.status}.`
              : result.status === 'Late'
                ? "The service already started, but you're recorded."
                : 'Have a great service.'}
          </p>
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      {/* Scanner secondary CTA — visible whenever a window is open. */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setScannerOpen(true)}
          disabled={!canCheckIn || pending}
        >
          <ScanLine className="mr-1.5 h-4 w-4" /> Scan QR at the desk
        </Button>
        {!canCheckIn && rows.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            The scanner unlocks the moment a service's window opens.
          </span>
        ) : null}
      </div>

      {/* Services grid */}
      {candidates.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-foreground/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Clock className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-foreground">Nothing scheduled today</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Come back closer to your next service.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {openRows.map((s) => (
            <ServiceCard
              key={s.serviceId}
              candidate={s}
              action={
                <Button
                  className="bg-[#5D3FD3] hover:bg-[#451ebb]"
                  onClick={() => handleTapCheckIn(s.serviceId)}
                  disabled={pending}
                >
                  <Check className="mr-1.5 h-4 w-4" /> I&apos;m here
                </Button>
              }
              badge={<StateBadge kind="open" />}
            />
          ))}
          {openingSoonRows.map((s) => (
            <ServiceCard
              key={s.serviceId}
              candidate={s}
              action={
                <span className="text-sm text-muted-foreground">
                  Opens in {s.minutesUntilOpen} min
                </span>
              }
              badge={<StateBadge kind="opens-soon" />}
            />
          ))}
          {closedRows.map((s) => (
            <ServiceCard
              key={s.serviceId}
              candidate={s}
              action={
                <span className="text-sm text-muted-foreground">
                  Ask a leader to record you.
                </span>
              }
              badge={<StateBadge kind="closed" />}
            />
          ))}
        </div>
      )}

      <QrScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScannedQr}
        title="Scan check-in QR"
        description="Point your camera at the code on the admin desk screen."
      />
    </div>
  );
}

function ServiceCard({
  candidate,
  action,
  badge,
}: {
  candidate: SelfCheckInCandidate;
  action: React.ReactNode;
  badge: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {badge}
            <span className="truncate font-semibold text-foreground">
              {candidate.serviceTitle ?? candidate.serviceType}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatShortDate(candidate.serviceDate)} · {formatServiceTime(candidate.serviceDate)}
          </p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

function StateBadge({ kind }: { kind: 'open' | 'opens-soon' | 'closed' }) {
  const styles = {
    open: 'bg-[#16A34A]/15 text-[#16A34A]',
    'opens-soon': 'bg-[#f8b537]/20 text-[#a07720] dark:text-[#f8b537]',
    closed: 'bg-muted/60 text-muted-foreground',
  }[kind];
  const label = { open: 'Open', 'opens-soon': 'Opens soon', closed: 'Closed' }[kind];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {label}
    </span>
  );
}
