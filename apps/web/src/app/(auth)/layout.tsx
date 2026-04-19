import { ThemeToggle } from '@/components/theme-toggle';
import { KharisLogoIcon } from './kharis-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel — hidden on mobile */}
      <div className="relative hidden w-[480px] flex-col justify-between overflow-hidden p-10 shadow-[2px_0_12px_-4px_rgba(0,0,0,0.08)] [background:radial-gradient(ellipse_at_50%_50%,_rgba(109,40,217,0.18)_0%,_rgba(93,63,211,0.10)_40%,_rgba(109,40,217,0.04)_70%,_transparent_100%),_white] dark:shadow-[8px_0_30px_-10px_rgba(0,0,0,0.5)] dark:[background:radial-gradient(ellipse_at_50%_50%,_#1e1050_0%,_#150d35_30%,_#0c0a1a_55%,_#07060e_75%,_#050408_100%)] lg:flex">

        {/* Top — Logo + name */}
        <div className="relative z-10 flex items-center gap-3">
          <KharisLogoIcon size={40} />
          <span className="text-lg font-bold uppercase tracking-widest text-gray-900 dark:text-white">Kharis Church</span>
        </div>

        {/* Centre — Verse display */}
        <div className="relative z-10 space-y-8">
          {/* Vision badge */}
          {/* <span className="inline-block rounded-full bg-[#f8b537]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#f8b537]">
            Vision {year}
          </span> */}

          {/* Stylised scripture */}
          <p className="text-[28px] font-light leading-snug text-gray-800 dark:text-white/90">
            Let all things be done{' '}
            <em className="font-semibold not-italic text-[#5D3FD3]">decently</em>{' '}
            and in{' '}
            <em className="font-semibold not-italic text-[#f8b537]">order</em>.
          </p>

          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-gray-200 dark:bg-white/20" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-gray-400 dark:text-white/50">
              1 Corinthians 14:40
            </span>
          </div>
        </div>

        {/* Bottom — Status badge */}
        <div className="relative z-10">
          {/* <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">All Systems Operational</span>
          </div> */}
        </div>
      </div>

      {/* Right content panel */}
      <div className="relative flex flex-1 items-center justify-center bg-[#f4f4f5] px-4 py-12 dark:bg-[#0d0d10]">
        {/* Theme toggle — top right */}
        <div className="absolute right-4 top-4">
          <ThemeToggle variant="full" />
        </div>

        <div className="w-full max-w-md space-y-6">
          {/* Mobile-only branding */}
          <div className="flex items-center justify-center gap-2 lg:hidden">
            <KharisLogoIcon size={32} />
            <span className="text-lg font-bold uppercase tracking-widest text-primary">Kharis Church</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
