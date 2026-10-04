'use client';

import Link from 'next/link';
import type {
  HomeActivityItem,
  HomeAgendaItem,
  HomeGettingStartedItem,
  HomeGroupSummary,
  HomePulse,
  HomeTaskItem,
} from '@kairos/types';

/**
 * The control-centre blocks, web edition. Same four blocks as the mobile home
 * screen and the same payload — on a phone they stack and priority is read
 * top-down; here they're zones and priority is read by position and size.
 *
 * Nothing here knows about roles. `altitude` in the payload decides which
 * blocks the page renders and where, which is what replaced the seven-way
 * persona cascade this page used to carry.
 *
 * Items arrive with ids, not routes — `hrefFor*` below is web's mapping.
 */

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {children}
      </p>
      {count !== undefined && count > 0 ? (
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#5D3FD3] dark:text-[#a78bfa]">
          {count}
        </span>
      ) : null}
    </div>
  );
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' });
}

export function hrefForAgendaItem(item: HomeAgendaItem): string {
  switch (item.kind) {
    case 'service':
      return `/attendance/${item.refs.serviceId}`;
    case 'rota':
      return '/departments';
    case 'fellowship_meeting':
      return `/fellowships/${item.refs.fellowshipId}`;
    case 'membership_session':
      return '/membership';
  }
}

export function hrefForTask(item: HomeTaskItem): string {
  switch (item.kind) {
    case 'member_approval':
      return '/members/approval';
    case 'fellowship_join':
      return '/fellowships';
    case 'department_join':
      return '/departments';
    case 'followup_due':
      return '/souls';
    // Web has no standalone register page — a fellowship's meetings and their
    // attendance live on the fellowship detail page.
    case 'register_missing':
      return `/fellowships/${item.refs.fellowshipId}`;
    case 'welfare_concern':
    case 'safeguarding_concern':
      return '/concerns';
    case 'membership_interest':
      return '/membership/interest';
    case 'rota_swap':
      return '/departments';
  }
}

export function hrefForGroup(group: HomeGroupSummary): string {
  if (group.kind === 'fellowship') return `/fellowships/${group.id}`;
  if (group.kind === 'department') return `/departments/${group.id}`;
  return `/admin/branches/${group.id}`;
}

function hrefForGettingStarted(item: HomeGettingStartedItem): string {
  if (item.key === 'join_fellowship') return '/fellowships';
  if (item.key === 'membership_interest') return '/membership/interest';
  return '/profile';
}

const WARNING_HREF: Record<string, string> = {
  members_drifting: '/attendance/reports',
  attendance_unrecorded: '/attendance',
  branches_behind: '/admin/branches',
  branch_without_pastor: '/admin/branches',
};

/** Numbers across the top. Branch and church altitude only. */
export function PulseBlock({ pulse }: { pulse: HomePulse }) {
  return (
    <section>
      <SectionLabel>{pulse.scope === 'church' ? 'Church pulse' : 'Branch pulse'}</SectionLabel>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pulse.metrics.map((metric) => (
          <div
            key={metric.key}
            className="rounded-lg border border-primary/20 bg-card p-4 shadow-ambient"
          >
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {metric.value.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{metric.label}</p>
            {metric.delta ? (
              <p className="mt-0.5 text-xs text-muted-foreground/70">{metric.delta}</p>
            ) : null}
          </div>
        ))}
      </div>
      {pulse.warnings.length > 0 ? (
        <div className="mt-3 space-y-2">
          {pulse.warnings.map((warning) => (
            <Link
              key={warning.kind}
              href={WARNING_HREF[warning.kind] ?? '/reports'}
              className="flex items-center gap-2 rounded-lg border border-[#f8b537]/40 bg-[#f8b537]/10 px-3 py-2 text-sm text-foreground transition-colors hover:bg-[#f8b537]/15"
            >
              <span aria-hidden className="text-[#9a6b04] dark:text-[#f8b537]">
                &#9888;
              </span>
              <span className="flex-1">{warning.text}</span>
              <span aria-hidden className="text-muted-foreground">
                &rarr;
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/** What's happening, time-ordered. The left column. */
export function AgendaBlock({
  label,
  items,
  withDay,
}: {
  label: string;
  items: HomeAgendaItem[];
  withDay?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      <div className="rounded-lg border border-primary/20 bg-card shadow-ambient">
        <div className="divide-y divide-border">
          {items.map((item) => (
            <Link
              key={`${item.kind}:${item.id}`}
              href={hrefForAgendaItem(item)}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
            >
              <div className="w-12 shrink-0">
                <p className="text-sm font-semibold text-foreground">
                  {withDay ? dayLabel(item.at) : timeLabel(item.at)}
                </p>
                {withDay ? (
                  <p className="text-xs text-muted-foreground/70">{timeLabel(item.at)}</p>
                ) : null}
              </div>
              <span
                aria-hidden
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  item.kind === 'rota' ? 'bg-[#f8b537]' : 'bg-[#5D3FD3]'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                {item.subtitle ? (
                  <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Things waiting on the caller. Web had no equivalent — approvals were a stat
 * card you had to notice and concerns lived on their own page.
 */
export function NeedsYouBlock({ items }: { items: HomeTaskItem[] }) {
  if (items.length === 0) return null;
  const total = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <section>
      <SectionLabel count={total}>Needs you</SectionLabel>
      <div className="rounded-lg border border-primary/20 bg-card shadow-ambient">
        <div className="divide-y divide-border">
          {items.map((item) => (
            <Link
              key={`${item.kind}:${item.id}`}
              href={hrefForTask(item)}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
            >
              {item.urgency === 'high' ? (
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e11d48]/15 text-xs text-[#e11d48]"
                >
                  &#9888;
                </span>
              ) : (
                <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#5D3FD3]/15 px-1.5 text-xs font-bold text-[#5D3FD3] dark:text-[#a78bfa]">
                  {item.count}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                {item.subtitle ? (
                  <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                ) : null}
              </div>
              <span aria-hidden className="text-muted-foreground">
                &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Led fellowships and departments, or every branch at church altitude. */
export function GroupsBlock({
  label,
  groups,
}: {
  label: string;
  groups: HomeGroupSummary[];
}) {
  if (groups.length === 0) return null;

  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      <div className="rounded-lg border border-primary/20 bg-card shadow-ambient">
        <div className="divide-y divide-border">
          {groups.map((group) => (
            <Link
              key={`${group.kind}:${group.id}`}
              href={hrefForGroup(group)}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {group.kind === 'branch'
                    ? `${group.headcount.toLocaleString()} in congregation`
                    : `${group.headcount} member${group.headcount === 1 ? '' : 's'}`}
                  {group.lastPresent !== null && group.lastTotal !== null
                    ? ` · last ${group.lastPresent}/${group.lastTotal}`
                    : group.lastPresent !== null
                      ? ` · last ${group.lastPresent.toLocaleString()} present`
                      : ''}
                </p>
              </div>
              <span aria-hidden className="text-muted-foreground">
                &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Replaces an empty agenda for a brand-new member. */
export function GettingStartedBlock({ items }: { items: HomeGettingStartedItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <SectionLabel>Getting started</SectionLabel>
      <div className="rounded-lg border border-primary/20 bg-card shadow-ambient">
        <div className="divide-y divide-border">
          {items.map((item) => (
            <Link
              key={item.key}
              href={hrefForGettingStarted(item)}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
            >
              <span
                aria-hidden
                className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/40"
              />
              <p className="flex-1 text-sm font-medium text-foreground">{item.title}</p>
              <span aria-hidden className="text-muted-foreground">
                &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function hrefForActivity(item: HomeActivityItem): string {
  switch (item.kind) {
    case 'member_joined':
    case 'membership_graduated':
      return `/members/${item.refs.memberId}`;
    case 'fellowship_met':
      return `/fellowships/${item.refs.fellowshipId}`;
    case 'form_submitted':
      return '/forms/submissions';
    case 'soul_captured':
      return '/souls';
  }
}

/** "2 hours ago", "Yesterday", "Tue" — recency is the point, not the clock. */
function whenLabel(iso: string): string {
  const then = new Date(iso);
  const minutes = Math.round((Date.now() - then.getTime()) / 60000);
  if (minutes < 60) return minutes <= 1 ? 'Just now' : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return then.toLocaleDateString('en-GB', { weekday: 'long' });
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** What has already happened, newest first. Empty at personal altitude. */
export function RecentActivityBlock({ items }: { items: HomeActivityItem[] }) {
  return (
    <section>
      <SectionLabel>Recent activity</SectionLabel>
      <div className="rounded-lg border border-primary/20 bg-card shadow-ambient">
        {items.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground/70">
            Nothing in the last two weeks.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <Link
                key={`${item.kind}:${item.id}`}
                href={hrefForActivity(item)}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    item.kind === 'membership_graduated' ? 'bg-[#f8b537]' : 'bg-[#5D3FD3]'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground/70">
                    {[whenLabel(item.at), item.subtitle].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** The only number a plain member gets, and it's about them. */
export function StreakBlock({ weeks }: { weeks: number }) {
  return (
    <section>
      <SectionLabel>You</SectionLabel>
      <Link
        href="/me/attendance"
        className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-card px-4 py-3 shadow-ambient transition-colors hover:bg-foreground/[0.04]"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">
            {weeks} week{weeks === 1 ? '' : 's'} running
          </p>
          <p className="text-xs text-muted-foreground">My attendance</p>
        </div>
        <span aria-hidden className="text-muted-foreground">
          &rarr;
        </span>
      </Link>
    </section>
  );
}

/** Skeleton while the single home request is in flight. */
export function HomeSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-primary/20 bg-muted"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-56 animate-pulse rounded-lg border border-primary/20 bg-muted" />
        <div className="h-56 animate-pulse rounded-lg border border-primary/20 bg-muted" />
      </div>
    </div>
  );
}
