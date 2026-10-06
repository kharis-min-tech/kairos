import { ThemeToggle } from '@/components/theme-toggle';
import { KharisLogoIcon } from './kharis-logo';
import { pickAuthVerse } from '@kairos/core';

/**
 * The auth shell.
 *
 * The brand used to stop dead at 480px, leaving the sign-in card floating on
 * flat grey — a hard vertical seam with an empty three-quarters beside it.
 * That seam, not the absence of animation, was what read as flat.
 *
 * Now a single field spans the whole viewport and everything sits on it. The
 * drifting colour points (globals.css, 28–46s, under 8% travel) give it depth
 * without ever being perceived as movement, and the verse rotates per load so
 * the page has a voice rather than a slogan.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const verse = pickAuthVerse();

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#fafafa] dark:bg-[#07060e]">
      {/* The field — one continuous background behind both columns. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="auth-field auth-blob-1" />
        <div className="auth-field auth-blob-2" />
        <div className="auth-field auth-blob-3" />
      </div>

      {/* Brand column. No background of its own any more — it sits ON the
          field, so there is nothing to seam against. */}
      <div className="relative z-10 hidden w-[480px] flex-col justify-between p-10 lg:flex">
        <div className="flex items-center gap-3">
          <KharisLogoIcon size={40} />
          <span className="text-lg font-bold uppercase tracking-widest text-gray-900 dark:text-white">
            Kharis Church
          </span>
        </div>

        <div className="space-y-8">
          <p className="auth-verse text-[28px] font-light leading-snug text-gray-800 dark:text-white/90">
            {verse.before}
            <em className="font-semibold not-italic text-[#5D3FD3] dark:text-[#a488ff]">
              {verse.primaryWord}
            </em>
            {verse.between}
            <em className="font-semibold not-italic text-[#f8b537]">{verse.accentWord}</em>
            {verse.after}
          </p>

          <div className="auth-verse-ref flex items-center gap-3">
            <div className="h-px w-8 bg-gray-300 dark:bg-white/20" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-gray-500 dark:text-white/50">
              {verse.reference}
            </span>
          </div>
        </div>

        <div />
      </div>

      {/* Content column. */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="absolute right-4 top-4">
          <ThemeToggle variant="full" />
        </div>

        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-center gap-2 lg:hidden">
            <KharisLogoIcon size={32} />
            <span className="text-lg font-bold uppercase tracking-widest text-primary">
              Kharis Church
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
