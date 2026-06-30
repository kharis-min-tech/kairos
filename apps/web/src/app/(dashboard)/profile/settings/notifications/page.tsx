'use client';

import Link from 'next/link';
import { ArrowLeft, Bell, Lock } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, CustomSelect } from '@kairos/ui';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABEL,
  NOTIFICATION_CATEGORY_DESCRIPTION,
  NotificationCategory,
  type NotificationCadence,
} from '@kairos/types';
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from '@/hooks/use-notification-preferences';

type SelectValue = 'off' | 'immediate' | 'digest_daily';

function toSelect(enabled: boolean, cadence: NotificationCadence): SelectValue {
  if (!enabled) return 'off';
  return cadence;
}

function fromSelect(value: SelectValue): { enabled: boolean; cadence: NotificationCadence } {
  if (value === 'off') return { enabled: false, cadence: 'immediate' };
  return { enabled: true, cadence: value };
}

const SELECT_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'digest_daily', label: 'Daily digest' },
  { value: 'off', label: 'Off' },
];

export default function NotificationsSettingsPage() {
  const { data, isLoading, isError, error } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreference();

  const prefByCategory = new Map(
    data?.preferences.map((p) => [p.category, p]) ?? [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2">
        <Link href="/profile/settings">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Settings
          </Button>
        </Link>
      </div>

      <div className="pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Choose which categories reach your inbox and how often.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-[#5D3FD3]" aria-hidden /> Email preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading preferences…
            </div>
          )}
          {isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Couldn&apos;t load preferences: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          )}
          {data && NOTIFICATION_CATEGORIES.map((category, idx) => {
            const pref = prefByCategory.get(category);
            const isSecurity = category === NotificationCategory.Security;
            const selectValue = pref ? toSelect(pref.enabled, pref.cadence) : 'immediate';

            return (
              <div
                key={category}
                className={`flex items-start justify-between gap-4 py-3 ${idx > 0 ? 'border-t' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {NOTIFICATION_CATEGORY_LABEL[category]}
                    </p>
                    {isSecurity && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#5D3FD3]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5D3FD3]">
                        <Lock className="h-2.5 w-2.5" /> Always on
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {NOTIFICATION_CATEGORY_DESCRIPTION[category]}
                  </p>
                </div>
                <div className="w-40 shrink-0">
                  <CustomSelect
                    value={selectValue}
                    onValueChange={(v) => {
                      const next = fromSelect(v as SelectValue);
                      updateMutation.mutate({
                        category,
                        enabled: next.enabled,
                        cadence: next.cadence,
                      });
                    }}
                    options={SELECT_OPTIONS}
                    disabled={isSecurity || updateMutation.isPending}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Daily digest sends a single 8&#8239;AM roundup per category instead of an
        email per event. Security alerts always go immediately.
      </p>
    </div>
  );
}
