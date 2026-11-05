'use client';

import { useState } from 'react';
import { Download, HandCoins, Link2, ShieldAlert, Undo2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CustomSelect,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@kairos/ui';
import {
  CHURCH_SCOPE,
  GIFT_AID_CANCELLATION_METHOD_LABEL,
  GIFT_AID_CHANNEL_LABEL,
  GIFT_AID_STATUS_LABEL,
  type GiftAidCancellationMethod,
  type GiftAidChannel,
  type GiftAidStatus,
} from '@kairos/types';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useDebounced } from '@/hooks/use-debounced';
import {
  useExportGiftAidRegister,
  useGiftAidDeclarations,
  useGiftAidMemberSearch,
  useMarkGiftAidInvalid,
  useMatchGiftAidDeclaration,
  useRecordGiftAidWithdrawal,
} from '@/hooks/use-gift-aid';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusTone(status: GiftAidStatus): string {
  if (status === 'active') return 'text-emerald-700 dark:text-emerald-400';
  if (status === 'invalid') return 'text-destructive';
  return 'text-muted-foreground';
}

/**
 * The Gift Aid admin surface: the register, the review queue of declarations
 * not yet matched to a member, and the two actions that cannot be done by the
 * donor themselves (recording a withdrawal that arrived by phone or letter,
 * and marking a declaration invalid).
 *
 * Gated on `giftaid:admin` at CHURCH_SCOPE. A branch grant does not reach it,
 * by design: a declaration names the charity, and it carries a home address
 * and a statement about the donor's tax affairs.
 */
export default function GiftAidAdminPage() {
  const caps = useCapabilities();
  const allowed = caps.has('giftaid:admin', CHURCH_SCOPE);

  const [status, setStatus] = useState<GiftAidStatus | 'all'>('active');
  const [unmatchedOnly, setUnmatchedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [withdrawMethod, setWithdrawMethod] = useState<GiftAidCancellationMethod>('letter');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [invalidId, setInvalidId] = useState<string | null>(null);
  const [invalidReason, setInvalidReason] = useState('');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState('');
  const debouncedMemberQuery = useDebounced(memberQuery, 300);

  const { data, isLoading, isError, error } = useGiftAidDeclarations({
    ...(status !== 'all' ? { status } : {}),
    ...(unmatchedOnly ? { unmatched: true } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    limit: 50,
  });

  const recordWithdrawal = useRecordGiftAidWithdrawal();
  const markInvalid = useMarkGiftAidInvalid();
  const matchDeclaration = useMatchGiftAidDeclaration();
  const exportRegister = useExportGiftAidRegister();
  const memberResults = useGiftAidMemberSearch(debouncedMemberQuery);

  if (!allowed) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">You don&apos;t have access to Gift Aid</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Gift Aid declarations are handled by the finance team. Ask an administrator for the
            Gift Aid Admin role if you need access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <HandCoins className="h-6 w-6 text-[#5D3FD3]" aria-hidden /> Gift Aid
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Declarations across the whole church. Kairos does not hold giving records, so the
            register is exported and joined against them.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled={exportRegister.isPending}
          onClick={async () => {
            const blob = await exportRegister.mutateAsync({ status: 'active' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gift-aid-register-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-4 w-4" aria-hidden />{' '}
          {exportRegister.isPending ? 'Preparing…' : 'Export register'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Declarations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or postcode"
              className="max-w-xs"
            />
            <CustomSelect
              size="sm"
              value={status}
              onValueChange={(v) => setStatus(v as GiftAidStatus | 'all')}
              options={[
                { value: 'active', label: 'In force' },
                { value: 'cancelled', label: 'Withdrawn' },
                { value: 'invalid', label: 'Not valid' },
                { value: 'all', label: 'All' },
              ]}
            />
            <Button
              variant={unmatchedOnly ? 'default' : 'outline'}
              size="sm"
              className="gap-1"
              onClick={() => setUnmatchedOnly((v) => !v)}
            >
              <Link2 className="h-4 w-4" aria-hidden /> Needs matching
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-2" aria-busy="true">
              <div className="h-10 animate-pulse rounded-md bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            </div>
          )}

          {isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Couldn&apos;t load declarations:{' '}
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          )}

          {!isLoading && !isError && !data?.items.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No declarations match these filters.
            </p>
          )}

          {!!data?.items.length && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Declared</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">
                        {[d.title, d.firstName, d.lastName].filter(Boolean).join(' ')}
                      </div>
                      <div className="text-xs text-muted-foreground">{d.email}</div>
                      {!d.memberId && (
                        <Badge variant="outline" className="mt-1 text-[#f8b537]">
                          Needs matching
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {[d.addressLine1, d.city, d.postcode || d.countryCode]
                        .filter(Boolean)
                        .join(', ')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDate(d.declaredAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {GIFT_AID_CHANNEL_LABEL[d.channel as GiftAidChannel]}
                    </TableCell>
                    <TableCell className={`text-xs ${statusTone(d.status as GiftAidStatus)}`}>
                      {GIFT_AID_STATUS_LABEL[d.status as GiftAidStatus]}
                      {d.cancelledAt && (
                        <div className="text-muted-foreground">{formatDate(d.cancelledAt)}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!d.memberId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              setMatchId(d.id);
                              setMemberQuery(d.lastName);
                              setWithdrawId(null);
                              setInvalidId(null);
                            }}
                          >
                            <Link2 className="h-3.5 w-3.5" aria-hidden /> Match
                          </Button>
                        )}
                      </div>
                      {d.status === 'active' && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              setWithdrawId(d.id);
                              setInvalidId(null);
                            }}
                          >
                            <Undo2 className="h-3.5 w-3.5" aria-hidden /> Withdraw
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setInvalidId(d.id);
                              setWithdrawId(null);
                            }}
                          >
                            Not valid
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {matchId && (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Match this declaration to a member</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Matching links the declaration to a Kairos profile so the member can see and
                withdraw it themselves. The name and address on the declaration are left exactly
                as the donor gave them, because those are the HMRC evidence and the profile may
                well disagree with them.
              </p>
              <Input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search by name or email"
                className="max-w-sm"
              />
              {memberResults.isLoading && debouncedMemberQuery.length >= 2 && (
                <p className="text-xs text-muted-foreground">Searching…</p>
              )}
              {!!memberResults.data?.length && (
                <div className="space-y-1">
                  {memberResults.data.slice(0, 8).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                      disabled={matchDeclaration.isPending}
                      onClick={async () => {
                        await matchDeclaration.mutateAsync({ id: matchId, memberId: m.id });
                        setMatchId(null);
                        setMemberQuery('');
                      }}
                    >
                      <span>
                        {m.firstName} {m.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">{m.phone ?? ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {debouncedMemberQuery.length >= 2 &&
                !memberResults.isLoading &&
                !memberResults.data?.length && (
                  <p className="text-xs text-muted-foreground">
                    No member matches that. The donor may not have a Kairos account yet, in which
                    case leave the declaration unmatched. It is still in force.
                  </p>
                )}
              {matchDeclaration.isError && (
                <p className="text-xs text-destructive">
                  {matchDeclaration.error instanceof Error
                    ? matchDeclaration.error.message
                    : 'Could not match the declaration.'}
                </p>
              )}
              <Button size="sm" variant="ghost" onClick={() => setMatchId(null)}>
                Cancel
              </Button>
            </div>
          )}

          {withdrawId && (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Record a withdrawal</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                HM Revenue and Customs requires the date and the method a withdrawal reached us.
                It takes effect from today and leaves earlier claims untouched.
              </p>
              <CustomSelect
                value={withdrawMethod}
                onValueChange={(v) => setWithdrawMethod(v as GiftAidCancellationMethod)}
                options={(
                  ['email', 'phone', 'letter', 'in_person'] as GiftAidCancellationMethod[]
                ).map((m) => ({ value: m, label: GIFT_AID_CANCELLATION_METHOD_LABEL[m] }))}
              />
              <Textarea
                value={withdrawNotes}
                onChange={(e) => setWithdrawNotes(e.target.value)}
                rows={2}
                placeholder="What the donor said, and when (optional)"
              />
              {recordWithdrawal.isError && (
                <p className="text-xs text-destructive">
                  {recordWithdrawal.error instanceof Error
                    ? recordWithdrawal.error.message
                    : 'Could not record the withdrawal.'}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={recordWithdrawal.isPending}
                  onClick={async () => {
                    await recordWithdrawal.mutateAsync({
                      id: withdrawId,
                      method: withdrawMethod,
                      ...(withdrawNotes ? { notes: withdrawNotes } : {}),
                    });
                    setWithdrawId(null);
                    setWithdrawNotes('');
                  }}
                >
                  {recordWithdrawal.isPending ? 'Recording…' : 'Record withdrawal'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setWithdrawId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {invalidId && (
            <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
              <p className="text-sm font-medium">Mark this declaration not valid</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Use this when the declaration does not meet HMRC&apos;s requirements: a missing
                address, an illegible scan, or a written confirmation returned undeliverable. The
                record is kept so we can show why nothing was claimed on it.
              </p>
              <Textarea
                value={invalidReason}
                onChange={(e) => setInvalidReason(e.target.value)}
                rows={2}
                placeholder="Why it is not valid"
              />
              {markInvalid.isError && (
                <p className="text-xs text-destructive">
                  {markInvalid.error instanceof Error
                    ? markInvalid.error.message
                    : 'Could not update the declaration.'}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={markInvalid.isPending || !invalidReason.trim()}
                  onClick={async () => {
                    await markInvalid.mutateAsync({ id: invalidId, reason: invalidReason });
                    setInvalidId(null);
                    setInvalidReason('');
                  }}
                >
                  {markInvalid.isPending ? 'Saving…' : 'Mark not valid'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setInvalidId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
