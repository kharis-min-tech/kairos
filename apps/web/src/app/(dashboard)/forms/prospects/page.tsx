'use client';

import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Badge,
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
} from '@kairos/ui';
import { formatShortDate } from '@/lib/date-format';
import { useDormantProspects, useArchiveProspects, useMyFormCapabilities } from '@/hooks/use-forms';

export default function ProspectsPage() {
  const { data: capabilities, isLoading: capLoading } = useMyFormCapabilities();
  const canSeeProspects = !!capabilities?.canSeeProspects;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, isError, error } = useDormantProspects(undefined, {
    enabled: canSeeProspects,
  });
  const archive = useArchiveProspects();

  if (capLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
        <span className="sr-only">Loading prospects</span>
      </div>
    );
  }

  if (!canSeeProspects) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Not authorised</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dormant-prospect cleanup is restricted to the Admin-department leader, pastors, and admins.
        </p>
      </div>
    );
  }

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dormant Prospects</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          These are contact shells created by forms 30+ days ago that never converted into an
          active member or enrollment. Archive the ones you no longer need to follow up.
        </p>
      </div>

      {selected.size > 0 ? (
        <div className="flex items-center justify-between rounded-lg bg-[#5D3FD3]/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selected.size} selected
          </span>
          <Button
            onClick={() => setConfirmOpen(true)}
            className="bg-[#5D3FD3] hover:bg-[#451ebb]"
          >
            Archive selected
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-foreground/5" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load prospects.'}
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No dormant prospects. Nothing to archive.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 accent-[#5D3FD3]"
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
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.firstName} ${p.lastName}`}
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 accent-[#5D3FD3]"
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {selected.size} prospect(s)?</DialogTitle>
            <DialogDescription>
              Archived shells are removed from the dormant list. This action can be reversed by an
              admin if needed.
            </DialogDescription>
          </DialogHeader>
          {archive.isError ? (
            <p className="text-sm text-destructive">
              {archive.error instanceof Error ? archive.error.message : 'Failed to archive.'}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleArchive}
              disabled={archive.isPending}
              className="bg-[#5D3FD3] hover:bg-[#451ebb]"
            >
              {archive.isPending ? 'Archiving…' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
