'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { resolveVerse, localiseReference } from '@kairos/core';
import { CardField } from '@/components/motion/card-field';
import { FloatCard } from '@/components/motion/float-card';
import { Spotlight } from '@/components/motion/spotlight';
import { useTranslation } from 'react-i18next';

/**
 * The auth shell's canvas, behind every auth and onboarding page: a quiet
 * ground with a purple corner top-left and a gold one bottom-right, a dot grid
 * and a cursor glow. The three floating cards are login's alone — they need
 * room, so they appear from lg up.
 */
export function AuthAmbient() {
  const { t, i18n } = useTranslation(['auth', 'common']);

  const login = usePathname() === '/login';
  // The verse card showed a hardcoded John 15:12 with no version named. It now
  // comes from the shared verse source, which carries a real Bible version per
  // language and says when it fell back to English.
  // Resolved after mount. The provider applies the stored language in an
  // effect, and on a reload that effect can land before this card finishes
  // hydrating -- the server has written the English verse and the client
  // wants the translated one, so React reports a mismatch and rebuilds the
  // tree. Nothing language-dependent is server-rendered here now.
  const [verse, setVerse] = useState<ReturnType<typeof resolveVerse> | null>(null);
  useEffect(() => setVerse(resolveVerse(i18n.language)), [i18n.language]);

  return (
    <>
      {/* The Canvas ground: a quiet page, not a full-page wash. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#fafafa] [background-image:radial-gradient(ellipse_60%_55%_at_0%_0%,rgba(93,63,211,0.36),transparent_70%),radial-gradient(ellipse_50%_45%_at_100%_100%,rgba(248,181,55,0.16),transparent_70%)] dark:bg-[#0a0a0a]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(hsl(var(--foreground)/0.12)_1px,transparent_1.2px)] [background-size:24px_24px]"
      />
      <Spotlight size={640} />
      {login && (
      <CardField className="hidden lg:block">
        <FloatCard position={{ left: '8%', bottom: '12%' }} depth={0.5} fx={-200} fy={200} fr={-14} tilt={-4} i={0}>
          <div className="w-[200px] rounded-[3px] bg-[#fdf3dc] px-4 py-3.5 text-[#3b2a06] shadow-[0_20px_50px_-16px_rgba(0,0,0,0.35)]">
            <div className="text-[10px] font-bold tracking-[0.16em] text-[#b07a10]">{t('auth:dailyVerse')}</div>
            <div className="mt-1.5 text-[13px] italic leading-[1.45]">
              {verse ? `“${verse.text}”` : ''}
            </div>
            <div className="mt-1.5 text-[11px] text-[#8a6410]">
              {verse ? `— ${localiseReference(verse.ref, i18n.language)} (${verse.version})` : ''}
              {verse?.fellBackToEnglish ? ` · ${t('common:shownInEnglish')}` : ''}
            </div>
          </div>
        </FloatCard>
        <FloatCard position={{ left: '40%', top: '8%' }} depth={0.8} fx={0} fy={-220} fr={10} tilt={3} i={1}>
          <div className="flex items-center gap-2.5 rounded border border-border bg-card px-3 py-2.5 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.35)]">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#5d3fd3] text-[10px] font-bold text-white">GL</span>
            <div>
              <div className="text-xs font-bold text-card-foreground">{t('auth:graceL')}</div>
              <div className="text-[10px] text-muted-foreground">{t('auth:movedTo')}<span className="text-[#8b74ec]">{t('auth:foundation')}</span>
              </div>
            </div>
          </div>
        </FloatCard>
        <FloatCard position={{ right: '4%', bottom: '7%' }} depth={0.3} fx={220} fy={160} fr={12} tilt={5} i={2}>
          <div className="w-[150px] rounded bg-card p-1.5 pb-2 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.4)]">
            <div
              className="h-[90px] rounded-sm bg-cover bg-center"
              style={{ backgroundImage: "url('/landing/hero.jpg')" }}
            />
            <div className="mt-1.5 px-0.5 text-[10px] font-semibold text-card-foreground">{t('auth:sundayService')}</div>
          </div>
        </FloatCard>
      </CardField>
      )}
    </>
  );
}
