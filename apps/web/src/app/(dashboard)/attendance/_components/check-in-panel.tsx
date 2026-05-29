'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, X, UserPlus } from 'lucide-react';
import { Button, Input, Label, Card, CardContent, TimeSelect, CustomSelect } from '@kairos/ui';
import { useServiceRoster, useRecordAttendance } from '@/hooks/use-attendance';
import { ServiceAttendanceStatus } from '@kairos/types';
import type {
  ServiceAttendanceStatus as Status,
  RecordAttendanceEntry,
} from '@kairos/types';
import { useDebounced } from '@/hooks/use-debounced';
import { RosterRow, type MarkState } from './roster-row';

interface VisitorMark {
  key: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: Status;
  arrivalTime?: string;
}

const STATUS_OPTIONS = [
  { value: ServiceAttendanceStatus.Present, label: 'Present' },
  { value: ServiceAttendanceStatus.Late, label: 'Late' },
  { value: ServiceAttendanceStatus.Virtual, label: 'Virtual' },
];

export function CheckInPanel({ serviceId }: { serviceId: string }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  const { data: roster, isLoading, isError, error } = useServiceRoster(
    serviceId,
    { search: debouncedSearch || undefined, limit: 50 },
  );
  const record = useRecordAttendance(serviceId);

  // memberId -> mark. Seeded from the roster's existing status on load.
  const [marks, setMarks] = useState<Record<string, MarkState>>({});
  const [visitors, setVisitors] = useState<VisitorMark[]>([]);
  const [saved, setSaved] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pre-populate marks from the roster's existing status (only fill ones not yet touched).
  useEffect(() => {
    if (!roster?.data) return;
    setMarks((prev) => {
      const next = { ...prev };
      for (const r of roster.data) {
        if (r.status && !(r.memberId in next)) {
          next[r.memberId] = { status: r.status };
        }
      }
      return next;
    });
  }, [roster]);

  function setStatus(memberId: string, status: Status) {
    setMarks((p) => ({ ...p, [memberId]: { status, arrivalTime: p[memberId]?.arrivalTime } }));
    setSaved(null);
  }
  function setArrival(memberId: string, time: string) {
    setMarks((p) => ({ ...p, [memberId]: { status: p[memberId]?.status ?? 'Late', arrivalTime: time } }));
  }
  function clearMark(memberId: string) {
    setMarks((p) => {
      const next = { ...p };
      delete next[memberId];
      return next;
    });
    setSaved(null);
  }

  const markedCount = Object.keys(marks).length + visitors.length;

  const entries: RecordAttendanceEntry[] = useMemo(() => {
    const memberEntries: RecordAttendanceEntry[] = Object.entries(marks).map(
      ([memberId, m]) => ({
        memberId,
        status: m.status,
        ...(m.status === ServiceAttendanceStatus.Late && m.arrivalTime
          ? { arrivalTime: m.arrivalTime }
          : {}),
      }),
    );
    const visitorEntries: RecordAttendanceEntry[] = visitors.map((v) => ({
      visitor: { firstName: v.firstName, lastName: v.lastName, ...(v.phone ? { phone: v.phone } : {}) },
      status: v.status,
      ...(v.status === ServiceAttendanceStatus.Late && v.arrivalTime ? { arrivalTime: v.arrivalTime } : {}),
    }));
    return [...memberEntries, ...visitorEntries];
  }, [marks, visitors]);

  async function handleSave() {
    setSaveError(null);
    try {
      const res = await record.mutateAsync({ entries });
      setSaved(res.recorded);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save attendance.');
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search the roster by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search roster"
        />
      </div>

      {/* Visitor add */}
      <VisitorAdd onAdd={(v) => { setVisitors((prev) => [...prev, v]); setSaved(null); }} />

      {visitors.length > 0 && (
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              First-time visitors ({visitors.length})
            </p>
            {visitors.map((v) => (
              <div key={v.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">
                  {v.firstName} {v.lastName}
                  <span className="ml-2 text-xs text-muted-foreground">{v.status}{v.phone ? ` · ${v.phone}` : ''}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove visitor ${v.firstName} ${v.lastName}`}
                  onClick={() => setVisitors((prev) => prev.filter((x) => x.key !== v.key))}
                  className="text-muted-foreground hover:text-[#dc2626]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Roster */}
      <Card>
        <CardContent className="py-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-foreground/5" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-lg bg-[#dc2626]/10 px-4 py-3 text-sm text-[#dc2626]">
              {error instanceof Error ? error.message : 'Could not load the roster.'}
            </div>
          ) : !roster || roster.data.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {search ? 'No members match your search.' : 'No members on this roster.'}
            </p>
          ) : (
            <div className="space-y-0.5">
              {roster.data.map((r) => (
                <RosterRow
                  key={r.memberId}
                  firstName={r.firstName}
                  lastName={r.lastName}
                  photoUrl={r.photoUrl}
                  mark={marks[r.memberId]}
                  onSetStatus={(s) => setStatus(r.memberId, s)}
                  onSetArrival={(t) => setArrival(r.memberId, t)}
                  onClear={() => clearMark(r.memberId)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/90 px-4 py-3 shadow-ambient backdrop-blur dark:bg-[#0f0f12]/90">
        <div className="text-sm">
          <span className="font-semibold text-foreground">{markedCount}</span>{' '}
          <span className="text-muted-foreground">marked attending</span>
          {saved !== null && (
            <span className="ml-3 font-medium text-[#16A34A]">Saved {saved} record{saved === 1 ? '' : 's'}.</span>
          )}
          {saveError && <span className="ml-3 text-[#dc2626]">{saveError}</span>}
        </div>
        <Button onClick={handleSave} disabled={record.isPending || markedCount === 0}>
          {record.isPending ? 'Saving…' : 'Save attendance'}
        </Button>
      </div>
    </div>
  );
}

function VisitorAdd({ onAdd }: { onAdd: (v: VisitorMark) => void }) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<Status>(ServiceAttendanceStatus.Present);
  const [arrivalTime, setArrivalTime] = useState('');
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setFirstName('');
    setLastName('');
    setPhone('');
    setStatus(ServiceAttendanceStatus.Present);
    setArrivalTime('');
    setErr(null);
  }

  function add() {
    if (!firstName.trim() || !lastName.trim()) {
      setErr('First and last name are required.');
      return;
    }
    onAdd({
      key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      status,
      arrivalTime: status === ServiceAttendanceStatus.Late ? arrivalTime || undefined : undefined,
    });
    reset();
    setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="mr-1.5 h-4 w-4" /> Add first-time visitor
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Add first-time visitor</p>
          <button type="button" aria-label="Cancel" onClick={() => { reset(); setOpen(false); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="visitor-first">First name</Label>
            <Input id="visitor-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visitor-last">Last name</Label>
            <Input id="visitor-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visitor-phone">Phone (optional)</Label>
            <Input id="visitor-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visitor-status">Status</Label>
            <CustomSelect
              id="visitor-status"
              value={status}
              onValueChange={(v) => setStatus(v as Status)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
        {status === ServiceAttendanceStatus.Late && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Arrived</span>
            <TimeSelect value={arrivalTime} onValueChange={setArrivalTime} allowEmpty />
          </div>
        )}
        {err && <p className="text-xs text-[#dc2626]">{err}</p>}
        <div className="flex justify-end">
          <Button onClick={add}>
            <Plus className="mr-1.5 h-4 w-4" /> Add visitor
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
