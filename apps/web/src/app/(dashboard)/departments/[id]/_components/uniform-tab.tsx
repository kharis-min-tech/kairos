'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CustomSelect,
  Input,
  Label,
  Textarea,
} from '@kairos/ui';
import { DateSelect } from '@kairos/ui';
import {
  useDepartmentOutfits,
  useUniformSchedule,
  useCreateOutfit,
  useDeactivateOutfit,
  useAssignUniform,
  useRemoveUniformAssignment,
} from '@/hooks/use-departments';
import { UniformGenderTarget } from '@kairos/types';
import type { DepartmentUniformOutfit, DepartmentUniformScheduleWithOutfit } from '@kairos/types';
import { useConfirm } from '@kairos/ui';

const GENDER_TARGETS = Object.values(UniformGenderTarget);

const GENDER_TONE: Record<string, string> = {
  Male: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  Female: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  Unisex: 'bg-[#5D3FD3]/15 text-[#5D3FD3] dark:text-[#a392ed]',
};

function GenderPill({ value, className = '' }: { value: string; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none ${GENDER_TONE[value] ?? 'bg-[#f0f0f3] text-foreground dark:bg-white/[0.06]'} ${className}`}
    >
      {value}
    </span>
  );
}

const MAX_IMAGE_BYTES = 500_000;

function resizeImageToBase64(file: File, maxDim = 800, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image load failed'));
    };
    img.src = objectUrl;
  });
}

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMonthShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d)
    .toLocaleDateString('en-GB', { month: 'short' })
    .toUpperCase();
}

function formatDayNumber(iso: string): string {
  const [, , d] = iso.split('-').map(Number);
  return d ? String(d) : '';
}

function formatWeekdayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d)
    .toLocaleDateString('en-GB', { weekday: 'short' })
    .toUpperCase();
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nextSundayIso(): string {
  const d = new Date();
  const offset = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface UniformTabProps {
  branchDeptId: string;
  canManage: boolean;
}

export function UniformTab({ branchDeptId, canManage }: UniformTabProps) {
  const today = todayIso();
  const todayDate = new Date(today);
  const fromIso = today;
  const toDate = new Date(todayDate);
  toDate.setDate(toDate.getDate() + 90);
  const toIso = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`;

  const outfitsQuery = useDepartmentOutfits(branchDeptId);
  const scheduleQuery = useUniformSchedule(branchDeptId, { from: fromIso, to: toIso });

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female' | 'Unisex'>('All');

  const outfits = outfitsQuery.data ?? [];
  const schedule = useMemo(() => scheduleQuery.data ?? [], [scheduleQuery.data]);

  const todaysAssignments = useMemo(
    () => schedule.filter((s) => s.serviceDate === today),
    [schedule, today],
  );
  const upcomingAssignments = useMemo(
    () => schedule.filter((s) => s.serviceDate > today).slice(0, 8),
    [schedule, today],
  );
  const filteredOutfits = useMemo(
    () => (genderFilter === 'All' ? outfits : outfits.filter((o) => o.genderTarget === genderFilter)),
    [outfits, genderFilter],
  );

  return (
    <div className="space-y-6">
      {/* Today's uniform — gold accent */}
      {todaysAssignments.length > 0 && (
        <Card className="border-[#f8b537]/40 bg-[#f8b537]/5">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s uniform</CardTitle>
            <CardDescription>{formatDateLong(today)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {todaysAssignments.map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  canManage={canManage}
                  branchDeptId={branchDeptId}
                  highlight
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Sundays */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Upcoming uniforms</CardTitle>
            <CardDescription>Next 90 days</CardDescription>
          </div>
          {canManage && (
            <Button
              size="sm"
              variant={showAssignForm ? 'outline' : 'default'}
              onClick={() => setShowAssignForm((s) => !s)}
              disabled={outfits.length === 0}
            >
              {showAssignForm ? 'Cancel' : '+ Assign date'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {showAssignForm && canManage && (
            <AssignForm
              branchDeptId={branchDeptId}
              outfits={outfits}
              onDone={() => setShowAssignForm(false)}
            />
          )}
          {scheduleQuery.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : upcomingAssignments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No upcoming assignments.{' '}
              {canManage && outfits.length > 0 && 'Use “Assign date” to schedule one.'}
              {canManage && outfits.length === 0 && 'Upload an outfit first.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingAssignments.map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  canManage={canManage}
                  branchDeptId={branchDeptId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outfit gallery */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Outfit gallery</CardTitle>
            <CardDescription>
              {outfits.length} {outfits.length === 1 ? 'outfit' : 'outfits'} available
            </CardDescription>
          </div>
          {canManage && (
            <Button
              size="sm"
              variant={showUploadForm ? 'outline' : 'default'}
              onClick={() => setShowUploadForm((s) => !s)}
            >
              {showUploadForm ? 'Cancel' : '+ Upload outfit'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {showUploadForm && canManage && (
            <UploadForm branchDeptId={branchDeptId} onDone={() => setShowUploadForm(false)} />
          )}
          {outfits.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {(['All', 'Male', 'Female', 'Unisex'] as const).map((g) => {
                const active = genderFilter === g;
                const count =
                  g === 'All' ? outfits.length : outfits.filter((o) => o.genderTarget === g).length;
                const tone =
                  g === 'All'
                    ? active
                      ? 'bg-[#5D3FD3] text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                    : active
                      ? GENDER_TONE[g] + ' ring-2 ring-offset-1 ring-current'
                      : (GENDER_TONE[g] ?? '') + ' opacity-70 hover:opacity-100';
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenderFilter(g)}
                    className={`rounded-full px-3 py-1 font-medium transition-all ${tone}`}
                  >
                    {g} {count > 0 && <span className="opacity-75">· {count}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {outfitsQuery.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading gallery…</p>
          ) : outfits.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No outfits yet.{' '}
              {canManage ? 'Upload your first outfit to start scheduling.' : ''}
            </p>
          ) : filteredOutfits.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No outfits in this category.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filteredOutfits.map((o) => (
                <OutfitCard
                  key={o.id}
                  outfit={o}
                  canManage={canManage}
                  branchDeptId={branchDeptId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Outfit card ────────────────────────────────────────────

function OutfitCard({
  outfit,
  canManage,
  branchDeptId,
}: {
  outfit: DepartmentUniformOutfit;
  canManage: boolean;
  branchDeptId: string;
}) {
  const deactivate = useDeactivateOutfit();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const handleArchive = async () => {
    const ok = await confirm({
      title: `Archive “${outfit.name}”?`,
      description: 'The outfit will no longer be available for new uniform schedules.',
      confirmLabel: 'Archive',
      variant: 'destructive',
    });
    if (!ok) return;
    deactivate.mutate(
      { branchDeptId, outfitId: outfit.id },
      {
        onSuccess: () => toast.success('Outfit archived'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Archive failed'),
      },
    );
  };
  return (
    <div className="flex flex-col overflow-hidden rounded-[4px] bg-surface-container-lowest">
      {confirmDialog}
      <div className="aspect-square w-full bg-surface-container-low">
        <img
          src={outfit.imageUrl}
          alt={outfit.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">{outfit.name}</p>
          <GenderPill value={outfit.genderTarget} />
        </div>
        {outfit.notes && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{outfit.notes}</p>
        )}
        {canManage && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleArchive}
            disabled={deactivate.isPending}
            className="mt-auto justify-start px-0 text-xs text-muted-foreground hover:text-destructive"
          >
            Archive
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Assignment card ────────────────────────────────────────

function AssignmentCard({
  assignment,
  canManage,
  branchDeptId,
  highlight = false,
}: {
  assignment: DepartmentUniformScheduleWithOutfit;
  canManage: boolean;
  branchDeptId: string;
  highlight?: boolean;
}) {
  const remove = useRemoveUniformAssignment();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const handleRemove = async () => {
    const ok = await confirm({
      title: `Remove uniform assignment for ${formatDateLong(assignment.serviceDate)}?`,
      description: 'The assignment will be cleared from the schedule. You can add it again later.',
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (!ok) return;
    remove.mutate(
      { branchDeptId, assignmentId: assignment.id },
      {
        onSuccess: () => toast.success('Assignment removed'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Remove failed'),
      },
    );
  };
  const isToday = assignment.serviceDate === todayIso();
  return (
    <div
      className={`flex gap-3 rounded-[4px] p-3 ${highlight ? 'bg-white/60 dark:bg-black/20' : 'bg-surface-container-lowest'}`}
    >
      {confirmDialog}
      <div
        className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-[4px] py-2 text-center ${
          isToday
            ? 'bg-[#f8b537]/20 text-[#a06b00] dark:text-[#f8b537]'
            : 'bg-surface-container-low text-foreground'
        }`}
      >
        <span className="text-[10px] font-semibold leading-none opacity-75">
          {formatMonthShort(assignment.serviceDate)}
        </span>
        <span className="my-0.5 text-xl font-bold leading-none">
          {formatDayNumber(assignment.serviceDate)}
        </span>
        <span className="text-[10px] font-medium leading-none opacity-75">
          {formatWeekdayShort(assignment.serviceDate)}
        </span>
      </div>
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[4px] bg-surface-container-low">
        <img
          src={assignment.outfitImageUrl}
          alt={assignment.outfitName}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm font-medium leading-tight">{assignment.outfitName}</p>
        <div className="flex flex-wrap items-center gap-2">
          <GenderPill value={assignment.genderTarget} />
          <span className="text-[11px] text-muted-foreground">
            Affects {assignment.affectsCount}{' '}
            {assignment.affectsCount === 1 ? 'member' : 'members'}
          </span>
        </div>
        {assignment.notes && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{assignment.notes}</p>
        )}
        {canManage && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRemove}
            disabled={remove.isPending}
            className="mt-auto justify-start px-0 text-xs text-muted-foreground hover:text-destructive"
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Upload form ────────────────────────────────────────────

function UploadForm({
  branchDeptId,
  onDone,
}: {
  branchDeptId: string;
  onDone: () => void;
}) {
  const create = useCreateOutfit();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [genderTarget, setGenderTarget] = useState<string>(UniformGenderTarget.Unisex);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const dataUri = await resizeImageToBase64(file);
      if (dataUri.length > MAX_IMAGE_BYTES) {
        toast.error(`Image too large after compression (${Math.round(dataUri.length / 1024)} KB > 500 KB). Try a smaller source.`);
        return;
      }
      setImageUrl(dataUri);
    } catch {
      toast.error('Failed to read image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !imageUrl) {
      toast.error('Name and image are required');
      return;
    }
    const trimmedNotes = notes.trim();
    create.mutate(
      {
        branchDeptId,
        data: {
          name: name.trim(),
          imageUrl,
          genderTarget,
          ...(trimmedNotes ? { notes: trimmedNotes } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success('Outfit added');
          setName('');
          setImageUrl('');
          setGenderTarget(UniformGenderTarget.Unisex);
          setNotes('');
          onDone();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Upload failed'),
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[4px] bg-surface-container-lowest p-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="outfit-name">Name</Label>
          <Input
            id="outfit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. White on white"
            maxLength={150}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Gender target</Label>
          <CustomSelect
            value={genderTarget}
            onValueChange={setGenderTarget}
            options={GENDER_TARGETS.map((g) => ({ value: g, label: g }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Image</Label>
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <div className="h-20 w-20 overflow-hidden rounded-[4px] bg-surface-container-low">
              <img src={imageUrl} alt="preview" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-[4px] bg-surface-container-low text-xs text-muted-foreground">
              No image
            </div>
          )}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Processing…' : imageUrl ? 'Replace image' : 'Choose image'}
            </Button>
            {imageUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setImageUrl('')}
                className="text-xs text-muted-foreground"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          JPG/PNG/WebP, auto-resized to ≤800px and ≤500KB.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="outfit-notes">Notes (optional)</Label>
        <Textarea
          id="outfit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Fabric, accessories, sourcing…"
          rows={2}
          maxLength={2000}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={create.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending || uploading || !imageUrl}>
          {create.isPending ? 'Saving…' : 'Add outfit'}
        </Button>
      </div>
    </form>
  );
}

// ── Assign form ────────────────────────────────────────────

function AssignForm({
  branchDeptId,
  outfits,
  onDone,
}: {
  branchDeptId: string;
  outfits: DepartmentUniformOutfit[];
  onDone: () => void;
}) {
  const assign = useAssignUniform();
  const [outfitId, setOutfitId] = useState<string>(outfits[0]?.id ?? '');
  const [serviceDate, setServiceDate] = useState<string>(nextSundayIso());
  const [notes, setNotes] = useState('');

  const selectedOutfit = useMemo(() => outfits.find((o) => o.id === outfitId), [outfits, outfitId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outfitId || !serviceDate) {
      toast.error('Outfit and date are required');
      return;
    }
    assign.mutate(
      {
        branchDeptId,
        data: {
          outfitId,
          serviceDate,
          genderTarget: selectedOutfit?.genderTarget,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success('Uniform scheduled');
          setNotes('');
          onDone();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Assignment failed'),
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[4px] bg-surface-container-lowest p-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Outfit</Label>
          <CustomSelect
            value={outfitId}
            onValueChange={setOutfitId}
            options={outfits.map((o) => ({
              value: o.id,
              label: `${o.name} · ${o.genderTarget}`,
            }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Service date</Label>
          <DateSelect value={serviceDate} onChange={setServiceDate} minDate={todayIso()} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="assign-notes">Notes (optional)</Label>
        <Textarea
          id="assign-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Special instructions for the team"
          rows={2}
          maxLength={2000}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={assign.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={assign.isPending}>
          {assign.isPending ? 'Saving…' : 'Schedule'}
        </Button>
      </div>
    </form>
  );
}
