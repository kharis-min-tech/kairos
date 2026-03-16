'use client';

import { Menu, Search, Bell, User, LogOut, Settings, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/ws';
import { useBranches } from '@/hooks/use-branches';
import { useUiStore } from '@/lib/stores/ui-store';

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const { data: branchesData } = useBranches({ limit: 50 });
  const { activeBranchId, setActiveBranchId } = useUiStore();
  const router = useRouter();
  const showBranchSelector = user?.role === 'Admin' || user?.role === 'Pastor';
  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center border-b border-topbar-border bg-topbar-bg px-4"
      role="banner"
    >
      {/* Hamburger (mobile only) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuToggle}
        className="mr-3 md:hidden"
        aria-label="Toggle navigation menu"
      >
        <Menu size={24} />
      </Button>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 mr-4" aria-label="Kairos home">
        <span className="text-xl font-bold text-primary">Kairos</span>
      </Link>

      {/* Branch selector (Admin/Pastor only, desktop) */}
      {showBranchSelector && (
        <div className="hidden md:flex items-center">
          <Select
            value={activeBranchId?.toString() ?? 'all'}
            onValueChange={(val) => setActiveBranchId(val === 'all' ? null : Number(val))}
          >
            <SelectTrigger className="w-[180px] h-10" aria-label="Filter by branch">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branchesData?.data?.map((branch) => (
                <SelectItem key={branch.branchId} value={branch.branchId.toString()}>
                  {branch.branchName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Search + Actions (right side) */}
      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <div className="hidden sm:flex items-center">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search..."
              className="w-48 rounded-lg border border-input bg-muted py-1.5 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[40px] lg:w-64"
              aria-label="Search"
            />
          </div>
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" asChild>
          <Link
            href="/notifications"
            className="relative"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {displayCount}
              </span>
            )}
          </Link>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="User menu">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User size={16} />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {user && (
              <div className="px-3 py-2 text-sm">
                <p className="font-medium truncate">{user.email}</p>
                <p className="text-muted-foreground text-xs">{user.role}</p>
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <UserCircle size={16} />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings size={16} />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive">
              <LogOut size={16} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
