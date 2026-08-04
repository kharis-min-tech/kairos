'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  useRegions,
  useCreateRegion,
  useUpdateRegion,
  useDeleteRegion,
} from '@/hooks/use-branches';
import { Button, Label, Card, CardContent, CardHeader, CardTitle, CardDescription, CustomSelect } from '@kairos/ui';
import { CONTINENTS, COUNTRIES_BY_CONTINENT } from '@kairos/core';
import { useAuthStore } from '@/lib/auth-store';
import { useConfirm } from '@/components/confirm-dialog';
import type { Region } from '@kairos/types';

type DialogMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; region: Region };

export default function RegionsPage() {
  const router = useRouter();
  const activeRole = useAuthStore((s) => s.activeRole);
  const { data: regions, isLoading } = useRegions();
  const createRegion = useCreateRegion();
  const updateRegion = useUpdateRegion();
  const deleteRegion = useDeleteRegion();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Second-level guard — admin-only.
  useEffect(() => {
    if (activeRole && activeRole !== 'admin') router.replace('/');
  }, [activeRole, router]);

  const [dialog, setDialog] = useState<DialogMode>({ kind: 'closed' });
  const [regionName, setRegionName] = useState('');
  const [country, setCountry] = useState('');

  const availableCountries = regionName ? (COUNTRIES_BY_CONTINENT[regionName] ?? []) : [];
  const activeMutation = dialog.kind === 'edit' ? updateRegion : createRegion;

  function openCreate() {
    setRegionName('');
    setCountry('');
    createRegion.reset();
    updateRegion.reset();
    setDialog({ kind: 'create' });
  }

  function openEdit(region: Region) {
    setRegionName(region.regionName);
    setCountry(region.country);
    createRegion.reset();
    updateRegion.reset();
    setDialog({ kind: 'edit', region });
  }

  function closeDialog() {
    setDialog({ kind: 'closed' });
    setRegionName('');
    setCountry('');
  }

  async function handleSubmit() {
    if (!regionName || !country) return;
    try {
      if (dialog.kind === 'edit') {
        await updateRegion.mutateAsync({
          id: dialog.region.id,
          data: { regionName, country },
        });
        toast.success('Region updated.');
      } else if (dialog.kind === 'create') {
        await createRegion.mutateAsync({ regionName, country });
        toast.success('Region created.');
      }
      closeDialog();
    } catch {
      // error surfaced via activeMutation.error in JSX
    }
  }

  async function handleDelete(region: Region) {
    const ok = await confirm({
      title: `Delete "${region.regionName} / ${region.country}"?`,
      description: 'This region has no branches attached, so it can be safely removed. This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteRegion.mutateAsync(region.id);
      toast.success('Region deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete region.');
    }
  }

  return (
    <div className="space-y-6">
      {confirmDialog}

      {/* Page header */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Regions</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage geographic regions{regions ? ` — ${regions.length} total` : ''}
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          onClick={openCreate}
        >
          + New Region
        </Button>
      </div>

      {/* Create/edit dialog — same shape as the old create card, just parameterised by mode */}
      {dialog.kind !== 'closed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {dialog.kind === 'edit' ? 'Edit Region' : 'Create Region'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="regionName">Continent *</Label>
                <CustomSelect
                  id="regionName"
                  value={regionName}
                  onValueChange={(v) => { setRegionName(v); setCountry(''); }}
                  placeholder="Select continent…"
                  options={CONTINENTS.map((c) => ({ value: c, label: c }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country *</Label>
                <CustomSelect
                  id="country"
                  value={country}
                  onValueChange={setCountry}
                  disabled={!regionName}
                  placeholder="Select country…"
                  options={availableCountries.map((c) => ({ value: c, label: c }))}
                />
              </div>
            </div>
            {activeMutation.error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {(activeMutation.error as Error).message}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                disabled={!regionName || !country || activeMutation.isPending}
                onClick={handleSubmit}
              >
                {activeMutation.isPending
                  ? (dialog.kind === 'edit' ? 'Saving…' : 'Creating…')
                  : (dialog.kind === 'edit' ? 'Save changes' : 'Create Region')}
              </Button>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regions grid */}
      {isLoading ? (
        <div aria-busy="true" aria-live="polite" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted/60" />
          ))}
          <span className="sr-only">Loading regions</span>
        </div>
      ) : !regions || regions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No regions found. Create one above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {regions.map((region) => {
            const branchCount = region.branchCount ?? 0;
            const locked = branchCount > 0;
            const lockedTitle = locked
              ? `${branchCount} branch${branchCount === 1 ? '' : 'es'} attached — move them first`
              : undefined;
            return (
              <Card key={region.id} className="transition-all hover:shadow-md hover:-translate-y-0.5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{region.regionName}</CardTitle>
                    <span className="flex-shrink-0 rounded-full bg-[#5D3FD3]/15 px-2.5 py-0.5 text-xs font-medium text-[#5D3FD3] dark:text-[#a78bfa]">
                      {branchCount} branch{branchCount === 1 ? '' : 'es'}
                    </span>
                  </div>
                  <CardDescription>{region.country}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-end gap-2 pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={locked}
                    title={lockedTitle}
                    onClick={() => openEdit(region)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={locked || deleteRegion.isPending}
                    title={lockedTitle}
                    onClick={() => handleDelete(region)}
                  >
                    Delete
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
