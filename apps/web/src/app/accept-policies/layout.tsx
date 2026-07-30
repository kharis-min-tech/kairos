import { ThemeToggle } from '@/components/theme-toggle';
import { KharisLogoIcon } from '@/app/(auth)/kharis-logo';

export default function AcceptPoliciesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-[#0d0d10]">
      <header className="border-b border-black/5 bg-white/60 backdrop-blur dark:border-white/5 dark:bg-black/20">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <KharisLogoIcon size={28} />
            <span className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-white">
              Kharis Church
            </span>
          </div>
          <ThemeToggle variant="icon" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
    </div>
  );
}
