'use client';

import { usePathname } from 'next/navigation';
import { CardField } from '@/components/motion/card-field';
import { FloatCard } from '@/components/motion/float-card';
import { Spotlight } from '@/components/motion/spotlight';

/**
 * The login page's canvas: a dot grid, a cursor glow and three cards that
 * drift in behind the form. It lives in the shared auth shell (the shell owns
 * the field it sits on) but only draws on /login — signup, reset and the rest
 * stay quiet. Cards need room, so they appear from lg up.
 */
export function LoginAmbient() {
  const pathname = usePathname();
  if (pathname !== '/login') return null;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(hsl(var(--foreground)/0.12)_1px,transparent_1.2px)] [background-size:24px_24px]"
      />
      <Spotlight size={640} />
      <CardField className="hidden lg:block">
        <FloatCard position={{ left: '8%', bottom: '12%' }} depth={0.5} fx={-200} fy={200} fr={-14} tilt={-4} i={0}>
          <div className="w-[200px] rounded-[3px] bg-[#fdf3dc] px-4 py-3.5 text-[#3b2a06] shadow-[0_20px_50px_-16px_rgba(0,0,0,0.35)]">
            <div className="text-[10px] font-bold tracking-[0.16em] text-[#b07a10]">DAILY VERSE</div>
            <div className="mt-1.5 text-[13px] italic leading-[1.45]">&ldquo;Love one another as I have loved you.&rdquo;</div>
            <div className="mt-1.5 text-[11px] text-[#8a6410]">— John 15:12</div>
          </div>
        </FloatCard>
        <FloatCard position={{ left: '40%', top: '8%' }} depth={0.8} fx={0} fy={-220} fr={10} tilt={3} i={1}>
          <div className="flex items-center gap-2.5 rounded border border-border bg-card px-3 py-2.5 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.35)]">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#5d3fd3] text-[10px] font-bold text-white">GL</span>
            <div>
              <div className="text-xs font-bold text-card-foreground">Grace L.</div>
              <div className="text-[10px] text-muted-foreground">
                Moved to <span className="text-[#8b74ec]">Foundation</span>
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
            <div className="mt-1.5 px-0.5 text-[10px] font-semibold text-card-foreground">Sunday Service</div>
          </div>
        </FloatCard>
      </CardField>
    </>
  );
}
