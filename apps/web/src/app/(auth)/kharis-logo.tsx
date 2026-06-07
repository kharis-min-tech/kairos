/**
 * Kharis Church branding components for auth pages.
 * - KharisLogoIcon: Purple rounded-square icon with dove logo (sidebar)
 * - KharisCardHeader: Dove logo + "Kharis Church" label for card headers
 */

import Image from 'next/image';

/** Dove logo inside a purple rounded square — used in the sidebar */
export function KharisLogoIcon({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-gradient-to-br from-[#451ebb] to-[#5d3fd3]"
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt="Kharis Church"
        width={size * 0.65}
        height={size * 0.65}
        priority
      />
    </div>
  );
}

/** Dove logo + "Kharis Church" — used above card headings */
export function KharisCardHeader({ heading, subtitle }: { heading: React.ReactNode; subtitle: React.ReactNode }) {
  return (
    <div className="px-1 text-center">
      <div className="mb-4 flex items-center justify-center gap-2">
        <Image src="/logo.png" alt="" width={22} height={22} className="opacity-80 invert dark:invert-0" />
        <span className="text-sm font-medium text-muted-foreground">Kharis Church</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
