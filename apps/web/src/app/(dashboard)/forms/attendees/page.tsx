'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Checkbox,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@kairos/ui';
import { formatShortDate } from '@kairos/core';
import {
  useDormantAttendees,
  useArchiveAttendees,
  useDormantVisitors,
  useArchiveVisitors,
  useMyFormCapabilities,
} from '@/hooks/use-forms';

type Cohort = 'attendees' | 'visitors';

export default function AttendeesPage() {
  const { data: capabilities, isLoading: capLoading } = useMyFormCapabilities();
  const canSeeAttendees = !!capabilities?.canSeeAttendees;
  const [cohort, setCohort] = useState<Cohort>('attendees');

  if (capLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (!canSeeAttendees) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Not authorised</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dormant cleanup is restricted to the Admin-department leader, pastors, and admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dormant Cleanup</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Contact shells created by forms 30+ days ago with no follow-up activity. Archive what
          you no longer need.
        </p>
      </div>

      <Tabs value={cohort} onValueChange={(v) => setCohort(v as Cohort)}>
        <TabsList aria-label="Cohort">
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
        </TabsList>
        <TabsContent value="attendees">
          <AttendeeCohortPanel />
        </TabsContent>
        <TabsContent value="visitors">
          <VisitorCohortPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Attendee cohort ────────────────────────────────────────

function AttendeeCohortPanel() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data, isLoading, isError, error } = useDormantAttendees();
  const archive = useArchiveAttendees();

  const rows = data ?? [];
  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  async function handleArchive() {
    const memberIds = [...selected];
    if (memberIds.length === 0) return;
    await archive.mutateAsync({ memberIds });
    setSelected(new Set());
    setConfirmOpen(false);
  }

  return (
    <div className="space-y-4 pt-4">
      {selected.size > 0 ? (
        <div className="flex items-center justify-between rounded-lg bg-[#5D3FD3]/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
          <Button onClick={() => setConfirmOpen(true)} className="bg-[#5D3FD3] hover:bg-[#451ebb]">
            Archive selected
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorCard message={error instanceof Error ? error.message : 'Failed to load attendees.'} />
      ) : rows.length === 0 ? (
        <EmptyCard message="No dormant attendees. Nothing to archive." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Enrollment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${p.firstName} ${p.lastName}`}
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {p.firstName} {p.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.phone ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatShortDate(p.createdAt)}
                  </TableCell>
                  <TableCell>
                    {p.hasEnrollment ? (
                      <Badge className="border border-[#5D3FD3]/30 bg-[#5D3FD3]/10 text-[#5D3FD3]">
                        Has enrollment
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ConfirmArchiveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        cohortLabel="attendee"
        count={selected.size}
        onConfirm={handleArchive}
        isPending={archive.isPending}
        error={archive.error}
      />
    </div>
  );
}

// ── Visitor cohort ─────────────────────────────────────────

function VisitorCohortPanel() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data, isLoading, isError, error } = useDormantVisitors();
  const archive = useArchiveVisitors();

  const rows = data ?? [];
  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  async function handleArchive() {
    const memberIds = [...selected];
    if (memberIds.length === 0) return;
    await archive.mutateAsync({ memberIds });
    setSelected(new Set());
    setConfirmOpen(false);
  }

  return (
    <div className="space-y-4 pt-4">
      {selected.size > 0 ? (
        <div className="flex items-center justify-between rounded-lg bg-[#5D3FD3]/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
          <Button onClick={() => setConfirmOpen(true)} className="bg-[#5D3FD3] hover:bg-[#451ebb]">
            Archive selected
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorCard message={error instanceof Error ? error.message : 'Failed to load visitors.'} />
      ) : rows.length === 0 ? (
        <EmptyCard message="No dormant visitors. Nothing to archive." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${p.firstName} ${p.lastName}`}
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {p.firstName} {p.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.phone ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatShortDate(p.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ConfirmArchiveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        cohortLabel="visitor"
        count={selected.size}
        onConfirm={handleArchive}
        isPending={archive.isPending}
        error={archive.error}
      />
    </div>
  );
}

// ── Shared bits ────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-foreground/5" />
      ))}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-destructive">{message}</CardContent>
    </Card>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}

function ConfirmArchiveDialog({
  open,
  onOpenChange,
  cohortLabel,
  count,
  onConfirm,
  isPending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cohortLabel: 'attendee' | 'visitor';
  count: number;
  onConfirm: () => void | Promise<void>;
  isPending: boolean;
  error: Error | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive {count} {cohortLabel}(s)?</DialogTitle>
          <DialogDescription>
            Archived shells are removed from the dormant list. This action can be reversed by an
            admin if needed.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to archive.'}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-[#5D3FD3] hover:bg-[#451ebb]"
          >
            {isPending ? 'Archiving…' : 'Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
