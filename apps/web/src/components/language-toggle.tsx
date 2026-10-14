'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { cn } from '@kairos/ui';
import { LANGUAGES, storedPreference, type LanguagePreference } from '@/lib/i18n';
import { setLanguagePreference } from '@/components/i18n-provider';

/**
 * Sidebar language picker, sitting beside the theme toggle.
 *
 * Mirrors the mobile picker: "Match my browser" plus each language under its
 * own name, with the unreviewed ones marked rather than presented as finished.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { t, i18n } = useTranslation(['common']);
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState<LanguagePreference>('system');

  // Read after mount: localStorage does not exist during the server render.
  useEffect(() => setPref(storedPreference()), []);

  const choose = (next: LanguagePreference) => {
    setLanguagePreference(next);
    setPref(next);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('common:language')}
        title={t('common:language')}
        className={cn('rounded-lg p-2 transition-colors', className)}
      >
        <Languages className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <>
          {/* Click-away without trapping focus elsewhere in the sidebar. */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute bottom-full z-50 mb-2 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitemradio"
              aria-checked={pref === 'system'}
              onClick={() => choose('system')}
              className={cn(
                'flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-sm hover:bg-foreground/5',
                pref === 'system' && 'font-semibold text-foreground',
              )}
            >
              {t('common:matchBrowser')}
            </button>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={pref === l.code}
                onClick={() => choose(l.code)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded px-2.5 py-1.5 text-left text-sm hover:bg-foreground/5',
                  pref === l.code && 'font-semibold text-foreground',
                )}
              >
                <span>{l.label}</span>
                {l.status === 'draft' ? (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t('common:draft')}
                  </span>
                ) : null}
              </button>
            ))}
            <p className="px-2.5 pb-1 pt-2 text-[11px] leading-snug text-muted-foreground">
              {i18n.language === 'kri' || i18n.language === 'tw'
                ? t('common:draftNote')
                : null}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
