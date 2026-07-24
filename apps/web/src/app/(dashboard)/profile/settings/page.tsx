'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Lock, Bell, Palette, LogOut, Download, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CustomSelect,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@kairos/ui';
import { downloadMyDataExportHtml, downloadMyDataExportJson, useDeleteMyAccount } from '@/hooks/use-me';

const DELETE_CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState<'html' | 'json' | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteMutation = useDeleteMyAccount();

  // Avoid hydration mismatch — theme is read from localStorage on the client.
  useEffect(() => setMounted(true), []);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  async function handleExport(format: 'html' | 'json') {
    setExporting(format);
    try {
      if (format === 'html') {
        await downloadMyDataExportHtml();
        toast.success('Your data has been downloaded as a readable report.');
      } else {
        await downloadMyDataExportJson();
        toast.success('Your data has been downloaded as JSON.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not export your data. Try again shortly.');
    } finally {
      setExporting(null);
    }
  }

  function openDeleteDialog() {
    setPassword('');
    setConfirmPhrase('');
    setDeleteError(null);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    setDeleteError(null);
    if (confirmPhrase !== DELETE_CONFIRM_PHRASE) {
      setDeleteError(`Please type "${DELETE_CONFIRM_PHRASE}" exactly to confirm.`);
      return;
    }
    if (!password) {
      setDeleteError('Please enter your current password.');
      return;
    }
    try {
      await deleteMutation.mutateAsync({ currentPassword: password });
      // Clear any cached data before we redirect.
      queryClient.clear();
      logout();
      router.replace('/login?deleted=1');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed. Please try again.');
    }
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
            <Link href="/profile/settings/change-password">
              <Button variant="outline" size="sm" className="rounded-lg">
                Change
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm font-medium">Change email</p>
              <p className="text-xs text-muted-foreground">
                Move your account to a new email. Both addresses get notified.
              </p>
            </div>
            <Link href="/profile/settings/email-change">
              <Button variant="outline" size="sm" className="rounded-lg">
                Change
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm font-medium">Recent sign-ins</p>
              <p className="text-xs text-muted-foreground">
                Sign-ins, password changes, and role updates on your account.
              </p>
            </div>
            <Link href="/profile/settings/security">
              <Button variant="outline" size="sm" className="rounded-lg">
                View
              </Button>
            </Link>
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
              <p className="text-sm font-medium">Legal &amp; consent</p>
              <p className="text-xs text-muted-foreground">
                Review the Terms, Privacy Notice, and marketing preferences.
              </p>
            </div>
            <Link href="/profile/settings/legal">
              <Button variant="outline" size="sm" className="rounded-lg">
                Manage
              </Button>
            </Link>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Download className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
                <div>
                  <p className="text-sm font-medium">Export my data</p>
                  <p className="text-xs text-muted-foreground">
                    Download a readable report of your personal data. Open it in
                    any browser and print or save as PDF.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => handleExport('html')}
                disabled={exporting !== null}
              >
                {exporting === 'html' ? 'Preparing…' : 'Download'}
              </Button>
            </div>
            <div className="mt-2 pl-7">
              <button
                type="button"
                onClick={() => handleExport('json')}
                disabled={exporting !== null}
                className="text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-[#5D3FD3] disabled:opacity-50"
              >
                {exporting === 'json' ? 'Preparing…' : 'Advanced: download as JSON'}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div className="flex items-start gap-3">
              <Trash2 className="mt-0.5 h-4 w-4 text-destructive" aria-hidden />
              <div>
                <p className="text-sm font-medium">Delete my account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently scrub your personal data. Attendance and
                  consent history are anonymised, not fully removed.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={openDeleteDialog}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete my account</DialogTitle>
            <DialogDescription>
              This will scrub your name, email, phone, address, photo and other
              personal details from Kharis Church. Your attendance history and
              consent audit trail stay in place but are anonymised. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm">
                Type <span className="font-mono font-semibold">{DELETE_CONFIRM_PHRASE}</span> to confirm
              </Label>
              <Input
                id="deleteConfirm"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Current password</Label>
              <Input
                id="deletePassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {deleteError && (
              <p className="text-sm text-destructive" role="alert">
                {deleteError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Permanently delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
