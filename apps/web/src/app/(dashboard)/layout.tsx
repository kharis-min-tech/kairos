'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { useCapabilities } from '@/hooks/use-capabilities';
import { useMyConsentStatuses } from '@/hooks/use-consent';
import { api } from '@/lib/api';
import { cn } from '@kairos/ui';
import type { Capability } from '@kairos/types';
import { ThemeToggle } from '@/components/theme-toggle';
import { MemberAvatar } from '@/components/member-avatar';
import { ConsentBanner } from '@/components/consent-banner';
// RBAC Phase 5b: in-app role switcher removed. Users see all their grants
// at once; per-page scope selectors handle the multi-scope cases.

// RBAC Phase 4c+: gating uses capabilities, not the dead pastor/leader
// activeRole values. `adminOnly` reserves the link for system admins
// (systemRole='admin'). `capability` checks via useCapabilities, which
// short-circuits to true for admins, so admins always see admin+pastor
// links automatically.
type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
  capability?: Capability;
  badge?: string;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/admin/branches', label: 'Branches', adminOnly: true },
  { href: '/admin/regions', label: 'Regions', adminOnly: true },
  { href: '/my-branch', label: 'My Branch', capability: 'branch:write' },
  { href: '/members', label: 'Members', capability: 'branch:write' },
  { href: '/fellowships', label: 'Fellowships' },
  // /attendance is open to all — page-level gating (canRecord) hides write CTAs from non-writers,
  // and Admin-dept members (systemRole='member') need the entry point to reach the desk.
  { href: '/attendance', label: 'Attendance' },
  // /attendance/check-in is the member self-check-in surface (honour system + QR scanner).
  // Open to any authenticated member — the API 403s if the branch has self-check-in off.
  { href: '/attendance/check-in', label: 'Check in' },
  { href: '/me/attendance', label: 'My Attendance' },
  { href: '/reports', label: 'Reports' },
  { href: '/new-believers', label: 'New Believers' },
  { href: '/departments', label: 'Departments' },
  { href: '/outreach/programs', label: 'Outreach Programs' },
  { href: '/souls', label: 'Souls Pipeline' },
  { href: '/forms', label: 'Forms' },
  { href: '/souls-dashboard', label: 'Souls Dashboard' },
  { href: '/profile', label: 'Profile' },
];

const NAV_ICONS: Record<string, React.ReactNode> = {
  '/dashboard': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  '/admin/branches': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18l2.25 2.25m0 0l6-6 6 6 2.25-2.25M12 3.75l6 6v10.5M9.75 21V12h4.5V21" />
    </svg>
  ),
  '/members': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  '/fellowships': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
  '/departments': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  '/reports': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  '/admin/regions': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  ),
  '/my-branch': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12c0 .778.099 1.533.284 2.253" />
    </svg>
  ),
  '/profile': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  '/outreach/programs': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.115 5.19l.319 1.913A6 6 0 008.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 002.288-4.042 1.087 1.087 0 00-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 01-.98-.314l-.295-.295a1.125 1.125 0 010-1.591l.13-.132a1.125 1.125 0 011.3-.21l.603.302a.809.809 0 001.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 001.528-1.732l.146-.292M6.115 5.19A9 9 0 1017.18 4.64M6.115 5.19A8.965 8.965 0 0112 3c1.929 0 3.716.607 5.18 1.64" />
    </svg>
  ),
  '/attendance': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  '/attendance/check-in': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  '/new-believers': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  '/souls': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
    </svg>
  ),
  '/souls-dashboard': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  ),
  '/dashboard#mission-control': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  '/forms': (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  ),
};

function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const isActive = item.href === '/dashboard'
    ? pathname === '/dashboard'
    : pathname === item.href || (pathname.startsWith(item.href + '/'));

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'border-l-2 border-violet-500 bg-primary/10 pl-[10px] text-foreground font-semibold'
          : 'border-l-2 border-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
      )}
    >
      {NAV_ICONS[item.href]}
      {item.label}
      {item.badge && (
        <span className="ml-auto rounded-full bg-[#5D3FD3] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    user,
    logout,
    activeRole,
    mustChangePassword,
    setUser,
    accessToken,
  } = useAuthStore();
  const caps = useCapabilities();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Wait for zustand-persist to rehydrate from localStorage before deciding
  // whether we're logged out. Otherwise every legitimate refresh flashes a
  // redirect to /login while accessToken is transiently null. Initial state
  // must be `false` (not read from persist) — this component is rendered
  // during SSG where `useAuthStore.persist` isn't reliably attached.
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    const p = useAuthStore.persist;
    if (!p) {
      setHasHydrated(true);
      return;
    }
    if (p.hasHydrated()) {
      setHasHydrated(true);
      return;
    }
    const unsub = p.onFinishHydration(() => setHasHydrated(true));
    return unsub;
  }, []);

  // Client-side auth guard. If someone hits a dashboard URL after logout
  // (or via Back after logout), send them to /login instead of painting
  // the chrome and letting every useQuery below 401 into an empty state.
  useEffect(() => {
    if (hasHydrated && !accessToken) {
      router.replace('/login');
    }
  }, [hasHydrated, accessToken, router]);

  // Hydrate user profile from API after page refresh (user is not persisted in localStorage)
  const { data: profileData } = useQuery({
    queryKey: ['members', 'me'],
    queryFn: async () => {
      const res = await api.members.me();
      return res.data!;
    },
    enabled: !!accessToken && !user,
  });

  useEffect(() => {
    if (profileData) setUser(profileData);
  }, [profileData, setUser]);

  useEffect(() => {
    if (mustChangePassword) {
      router.replace('/change-password');
    }
  }, [mustChangePassword, router]);

  // Phase 1.5 Better-Auth: SSO onboarding + approval gates. Both onboarding
  // and pending-approval live in the (auth) chrome — no sidebar, no
  // clickable nav — so the user's not misled into thinking they can browse
  // yet. Since (auth) routes never mount this layout, we only need to catch
  // dashboard-side entrance and bounce out.
  const mustCompleteProfile =
    (user as { mustCompleteProfile?: boolean })?.mustCompleteProfile === true;
  const approvalStatus = user?.approvalStatus ?? null;
  useEffect(() => {
    if (!user) return;
    if (mustCompleteProfile) {
      router.replace('/complete-profile');
      return;
    }
    if (approvalStatus && approvalStatus !== 'approved') {
      router.replace('/pending-approval');
    }
  }, [user, mustCompleteProfile, approvalStatus, router]);

  // Consent gate: any required policy that hasn't been accepted forces the
  // caller to /accept-policies before the dashboard renders. Mirrors the
  // mustChangePassword gate above. The API middleware provides the same
  // enforcement server-side — the client redirect is a UX niceness on top.
  //
  // We block the dashboard render entirely until the query has resolved AND
  // no required consents are pending. Without that we'd flash the dashboard
  // chrome + content for one render before the redirect fires. React Query
  // caches the result for 5 minutes (see useMyConsentStatuses), so warm
  // navigations don't pay the round-trip.
  const { data: consentData, isPending: consentQueryPending } = useMyConsentStatuses();
  const pendingConsentCount = consentData
    ? consentData.statuses.filter((s) => s.required && s.needsAccept).length
    : 0;
  useEffect(() => {
    if (pendingConsentCount > 0) {
      router.replace('/accept-policies');
    }
  }, [pendingConsentCount, router]);

  function handleLogout() {
    logout();
    // Purge any cached responses from the previous session so a subsequent
    // login (or the redirect flash) can't surface stale data.
    queryClient.clear();
    router.replace('/login');
  }

  // Suppress render entirely until we know for sure whether the caller is
  // authenticated. Prevents the sidebar + failing fetches from appearing
  // when the store is empty (post-logout URL nav) or still hydrating.
  if (!hasHydrated || !accessToken) return null;

  // Block dashboard render while the consent gate is deciding. Two cases:
  //   1. First page load with unresolved consent query — waiting on the
  //      network. Painting the dashboard now and redirecting a beat later
  //      causes the "flash of dashboard" the user reported.
  //   2. Query resolved with pending required consents — the useEffect above
  //      has already fired router.replace('/accept-policies') this render;
  //      returning null avoids painting the dashboard for one frame while
  //      the router swaps routes.
  if (consentQueryPending || pendingConsentCount > 0) return null;

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly) return activeRole === 'admin';
    if (item.capability) return caps.has(item.capability);
    return true;
  });

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white/80 backdrop-blur-[20px] dark:bg-[#0f0f12]/80">
      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-3 px-6 py-5">
        <img src="/logo.png" alt="Kharis Church" className="h-9 w-9 object-contain" />
        <div>
          <p className="text-base font-bold leading-tight text-foreground">Kairos</p>
          <p className="text-xs text-muted-foreground">Church Admin</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 pb-4">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={() => setMobileOpen(false)}
          />
        ))}
        <a
          href="https://docs.kairos.kharis.org"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          Help & Guides
          <svg className="ml-auto h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </nav>

      {/* User section */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <MemberAvatar
            photoUrl={(user as { photoUrl?: string | null })?.photoUrl}
            firstName={user?.firstName}
            lastName={user?.lastName}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.honorific ?? (user?.systemRole === 'admin' ? 'Administrator' : 'Member')}
            </p>
          </div>
          <Link
            href="/profile/settings"
            className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            aria-label="Settings"
            title="Settings"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <ThemeToggle className="flex-shrink-0 text-muted-foreground hover:bg-foreground/5 hover:text-foreground" />
          <button
            onClick={handleLogout}
            className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            aria-label="Sign out"
            title="Sign out"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between bg-white/80 backdrop-blur-[20px] px-4 dark:bg-[#0f0f12]/80 md:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-foreground hover:bg-foreground/5"
              aria-label="Open navigation"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <rect y="3" width="20" height="2" rx="1" />
                <rect y="9" width="20" height="2" rx="1" />
                <rect y="15" width="20" height="2" rx="1" />
              </svg>
            </button>
            <span className="text-lg font-bold text-foreground">Kairos</span>
          </div>
          <ThemeToggle className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <ConsentBanner />
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
