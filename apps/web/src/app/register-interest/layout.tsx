import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND_NAME } from '@kairos/types';
import { ThemeToggle } from '@/components/theme-toggle';
import { ShootingStars } from '@/components/motion/shooting-stars';
import { KharisLogoIcon } from '@/app/(auth)/kharis-logo';

export const metadata: Metadata = {
  title: `Put your branch forward | ${BRAND_NAME}`,
  description: `One branch runs fully on ${BRAND_NAME} before the end of 2026. If that should be yours, read what it asks of you and tell us.`,
  openGraph: {
    title: `Put your branch forward | ${BRAND_NAME}`,
    description: `One branch goes first. Read what it asks of you, then tell us.`,
    type: 'website',
  },
};

/**
 * Chrome for the pilot sign-up.
 *
 * Outside the (auth) and (dashboard) groups, like the public Gift Aid pages:
 * every branch leader reading this is doing so before anyone at their branch
 * has an account. The header links home rather than to a sign-in they cannot
 * complete.
 */
export default function RegisterInterestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-[#07070a]">
      {/*
        Behind everything, and behind the header's backdrop-blur too. The
        stars need a stacking context they cannot escape, which is why the
        wrapper is relative and clips: a trail that ran past the viewport
        edge would otherwise add a scrollbar on a page that has no more
        content.
      */}
      <ShootingStars />
      <div className="relative">
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-black/40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <KharisLogoIcon size={26} />
            <span className="text-sm font-black uppercase tracking-[0.18em] text-[#1a1c1c] dark:text-white">
              {BRAND_NAME}
            </span>
          </Link>
          <ThemeToggle variant="icon" />
        </div>
      </header>

      <main>{children}</main>

      <footer className="relative border-t border-black/[0.06] px-6 py-8 dark:border-white/[0.06]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 text-xs text-black/50 dark:text-white/40">
          <Link href="/legal/privacy" className="hover:text-[#5D3FD3]">Privacy Notice</Link>
          <Link href="/legal/terms" className="hover:text-[#5D3FD3]">Terms &amp; Conditions</Link>
        </div>
      </footer>
      </div>
    </div>
  );
}
