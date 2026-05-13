'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Button, Card, CardContent, CardHeader, CardTitle, CustomSelect } from '@kairos/ui';

const NOTIFICATION_KEYS = [
  { key: 'kairos_push_enabled', label: 'Push Notifications', description: 'Receive push notifications for announcements and updates' },
  { key: 'kairos_email_enabled', label: 'Email Notifications', description: 'Receive email notifications for important updates' },
  { key: 'kairos_sms_enabled', label: 'SMS Notifications', description: 'Receive SMS alerts for urgent announcements' },
] as const;

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function useLocalToggle(key: string, defaultValue = true): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) setValue(stored === 'true');
  }, [key]);

  function set(v: boolean) {
    setValue(v);
    localStorage.setItem(key, String(v));
  }

  return [value, set];
}

function getLocalStorageSize(): { used: number; total: number } {
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      used += key.length + (localStorage.getItem(key)?.length ?? 0);
    }
  }
  // localStorage limit is typically ~5 MB (chars = bytes for ASCII)
  return { used, total: 5 * 1024 * 1024 };
}

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 5 * 1024 * 1024 });
  const [cacheCleared, setCacheCleared] = useState(false);

  const [pushEnabled, setPushEnabled] = useLocalToggle('kairos_push_enabled');
  const [emailEnabled, setEmailEnabled] = useLocalToggle('kairos_email_enabled');
  const [smsEnabled, setSmsEnabled] = useLocalToggle('kairos_sms_enabled');

  useEffect(() => {
    setStorageInfo(getLocalStorageSize());
  }, [cacheCleared]);

  function handleClearCache() {
    // Preserve auth-related keys
    const authData = localStorage.getItem('kairos-auth-storage');
    localStorage.clear();
    if (authData) localStorage.setItem('kairos-auth-storage', authData);
    setCacheCleared(true);
    setStorageInfo(getLocalStorageSize());
    setTimeout(() => setCacheCleared(false), 3000);
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const usedKB = (storageInfo.used / 1024).toFixed(1);
  const totalMB = (storageInfo.total / (1024 * 1024)).toFixed(0);
  const usagePercent = Math.min((storageInfo.used / storageInfo.total) * 100, 100);

  const toggles = [
    { ...NOTIFICATION_KEYS[0], checked: pushEnabled, onChange: setPushEnabled },
    { ...NOTIFICATION_KEYS[1], checked: emailEnabled, onChange: setEmailEnabled },
    { ...NOTIFICATION_KEYS[2], checked: smsEnabled, onChange: setSmsEnabled },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">App Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage your notification preferences and app data</p>
        </div>
      </div>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              <Toggle checked={t.checked} onChange={t.onChange} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Clear Cache</p>
              <p className="text-xs text-muted-foreground">Remove cached data to free up space (keeps your login)</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={handleClearCache}>
              {cacheCleared ? 'Cleared!' : 'Clear'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Export Data</p>
              <p className="text-xs text-muted-foreground">Download a copy of your personal data</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle>Storage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Local storage used</span>
            <span className="font-medium">{usedKB} KB / {totalMB} MB</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferences (disabled for now) */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Language</p>
              <p className="text-xs text-muted-foreground">App display language</p>
            </div>
            <CustomSelect
              disabled
              value="English"
              onValueChange={() => {}}
              options={[{ value: 'English', label: 'English' }]}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">App appearance</p>
            </div>
            <CustomSelect
              disabled
              value="Light"
              onValueChange={() => {}}
              options={[{ value: 'Light', label: 'Light' }]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Log Out */}
      <Button
        className="h-11 w-full rounded-lg bg-rose-600 font-semibold text-white hover:bg-rose-700"
        onClick={handleLogout}
      >
        Log Out
      </Button>
    </div>
  );
}
