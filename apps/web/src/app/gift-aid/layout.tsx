import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { KharisLogoIcon } from '@/app/(auth)/kharis-logo';

/**
 * Overrides the root metadata, which says "Kairos: Church Administration".
 * This route is reached by scanning a QR code on a card, so what the phone
 * shows after the scan, and what a shared link previews as, is the only
 * branding a donor sees. "Kairos" is the staff product's name and means
 * nothing to them.
 */
export const metadata: Metadata = {
  title: 'Gift Aid declaration | Kharis Church',
  description:
    'Make a Gift Aid declaration so Kharis Church can reclaim 25p for every £1 you give, at no extra cost to you.',
  openGraph: {
    title: 'Gift Aid declaration | Kharis Church',
    description:
      'Make a Gift Aid declaration so Kharis Church can reclaim 25p for every £1 you give, at no extra cost to you.',
    type: 'website',
  },
};

/**
 * Chrome for the public Gift Aid pages. Mirrors `app/legal/layout.tsx`: this
 * route sits outside both the (auth) and (dashboard) groups because the people
 * it serves have no account yet, which is the whole point of collecting
 * declarations before the Kairos rollout.
 */
/**
 * The church's public website. The people on this page arrive from a link
 * the church gave them and have no Kairos account, so "Kharis Church" has to
 * mean kharis.org: sending them to `/` would land them on the Kairos product
 * landing page with a sign-in button, which is not a thing they can use.
 */
const CHURCH_SITE = 'https://kharis.org';

export default function GiftAidLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-[#0d0d10]">
      <header className="border-b border-black/5 bg-white/60 backdrop-blur dark:border-white/5 dark:bg-black/20">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <a href={CHURCH_SITE} className="flex items-center gap-2">
            <KharisLogoIcon size={28} />
            <span className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-white">
              Kharis Church
            </span>
          </a>
          <ThemeToggle variant="icon" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>

      <footer className="mx-auto max-w-3xl px-6 pb-10 pt-4 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/legal/privacy" className="hover:text-[#5D3FD3] hover:underline">
            Privacy Notice
          </Link>
          <Link href="/legal/terms" className="hover:text-[#5D3FD3] hover:underline">
            Terms &amp; Conditions
          </Link>
        </div>
      </footer>
    </div>
  );
}
