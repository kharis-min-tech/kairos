import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { KharisLogoIcon } from '@/app/(auth)/kharis-logo';

/**
 * Chrome for the public Gift Aid pages. Mirrors `app/legal/layout.tsx`: this
 * route sits outside both the (auth) and (dashboard) groups because the people
 * it serves have no account yet, which is the whole point of collecting
 * declarations before the Kairos rollout.
 */
export default function GiftAidLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-[#0d0d10]">
      <header className="border-b border-black/5 bg-white/60 backdrop-blur dark:border-white/5 dark:bg-black/20">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <KharisLogoIcon size={28} />
            <span className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-white">
              Kharis Church
            </span>
          </Link>
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
