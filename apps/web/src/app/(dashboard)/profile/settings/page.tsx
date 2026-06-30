'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Lock, Bell, Palette, LogOut, Download, FileText, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { Button, Card, CardContent, CardHeader, CardTitle, CustomSelect } from '@kairos/ui';

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — theme is read from localStorage on the client.
  useEffect(() => setMounted(true), []);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">App Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage how the app looks, behaves, and protects your data
          </p>
        </div>
      </div>

      {/* Account & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Account & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Change password</p>
              <p className="text-xs text-muted-foreground">
                Update your login password. You&apos;ll need your current one.
              </p>
            </div>
            <Link href="/change-password">
              <Button variant="outline" size="sm" className="rounded-lg">
                Change
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm font-medium">Recent sign-ins</p>
              <p className="text-xs text-muted-foreground">
                Review where you&apos;ve been signed in (coming soon).
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Display
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">
                Light, dark, or match your device&apos;s preference.
              </p>
            </div>
            <div className="w-40">
              <CustomSelect
                value={mounted ? (theme ?? 'system') : 'system'}
                onValueChange={(v) => setTheme(v)}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div>
              <p className="text-sm font-medium">Language</p>
              <p className="text-xs text-muted-foreground">
                Currently English only — more languages coming.
              </p>
            </div>
            <div className="w-40">
              <CustomSelect
                disabled
                value="English"
                onValueChange={() => {}}
                options={[{ value: 'English', label: 'English' }]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email preferences</p>
              <p className="text-xs text-muted-foreground">
                Choose which categories reach your inbox and how often.
              </p>
            </div>
            <Link href="/profile/settings/notifications">
              <Button variant="outline" size="sm" className="rounded-lg">
                Manage
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Privacy & Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Read the privacy notice</p>
              <p className="text-xs text-muted-foreground">
                How Kharis Church handles your personal data.
              </p>
            </div>
            <a
              href="https://kharis.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button variant="outline" size="sm" className="rounded-lg">
                Open
              </Button>
            </a>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div className="flex items-start gap-3">
              <Download className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <div>
                <p className="text-sm font-medium">Export my data</p>
                <p className="text-xs text-muted-foreground">
                  Download a copy of your personal data (GDPR right to
                  portability).
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg" disabled>
              Coming Soon
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div className="flex items-start gap-3">
              <Trash2 className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <div>
                <p className="text-sm font-medium">Delete my account</p>
                <p className="text-xs text-muted-foreground">
                  Withdraw consent and request account deletion.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log Out */}
      <Button
        variant="destructive"
        className="h-11 w-full rounded-lg font-semibold"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" aria-hidden /> Log Out
      </Button>
    </div>
  );
}
