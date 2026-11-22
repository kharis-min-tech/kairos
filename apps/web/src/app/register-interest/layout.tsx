import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND_NAME } from '@kairos/types';
import { ThemeToggle } from '@/components/theme-toggle';
import { KharisLogo } from '@/app/(auth)/kharis-logo';

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
    <div className="relative min-h-screen bg-white dark:bg-[#07070a]">
      <div className="relative">
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-black/40">
        <div className="flex items-center justify-between px-6 py-4 md:px-16 md:py-5">
          {/* The same lockup the landing page uses, so the two read as one site.
              A tile plus the name typed out beside it is not the logo. */}
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <KharisLogo height={30} className="text-[#5D3FD3] dark:text-white" />
          </Link>
          <ThemeToggle variant="icon" />
        </div>
      </header>

      <main>{children}</main>

      <footer className="relative border-t border-black/[0.06] px-6 py-8 md:px-16 dark:border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-black/50 dark:text-white/40">
          <Link href="/legal/privacy" className="hover:text-[#5D3FD3]">Privacy Notice</Link>
          <Link href="/legal/terms" className="hover:text-[#5D3FD3]">Terms &amp; Conditions</Link>
        </div>
      </footer>
      </div>
    </div>
  );
}
