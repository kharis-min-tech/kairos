import { ThemeToggle } from '@/components/theme-toggle';
import { KharisLogoIcon } from '@/app/(auth)/kharis-logo';
import { AuthAmbient } from '@/app/(auth)/auth-ambient';

export default function AcceptPoliciesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a]">
      {/* The Canvas ground — tints and dot grid only. No cursor glow here: this
          page is for reading the policies, and nothing should move behind the
          text. */}
      <AuthAmbient glow={false} />
      <header className="relative z-10 border-b border-black/5 bg-white/60 backdrop-blur dark:border-white/5 dark:bg-black/20">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <KharisLogoIcon size={28} draw />
            <span className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-white">
              Kharis Church
            </span>
          </div>
          <ThemeToggle variant="icon" />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-10">{children}</main>
    </div>
  );
}
