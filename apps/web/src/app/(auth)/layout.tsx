import { ThemeToggle } from '@/components/theme-toggle';
import { KharisLogoIcon } from './kharis-logo';
import { AuthField } from './auth-field';
import { pickAuthVerse } from '@kairos/core';
import { HandDrawn } from '@/components/motion/hand-drawn';
import { Reveal } from '@/components/motion/reveal';
import { LoginAmbient } from './login-ambient';

/** Verse entrance: words rise one by one, 85ms apart, after a 400ms beat. */
const WORD_STAGGER_MS = 85;
const VERSE_START_MS = 400;

/** Splits plain verse text into rising words, keeping the spaces between. */
function words(text: string, start: number): { nodes: React.ReactNode[]; next: number } {
  let i = start;
  const nodes = text.split(/(\s+)/).map((tok, k) => {
    if (tok === '' || /^\s+$/.test(tok)) return tok;
    const el = (
      <span
        key={k}
        className="mo-load inline-block"
        style={{ ['--i' as string]: i, animationDelay: `${VERSE_START_MS + i * WORD_STAGGER_MS}ms` }}
      >
        {tok}
      </span>
    );
    i += 1;
    return el;
  });
  return { nodes, next: i };
}

/**
 * The auth shell.
 *
 * The brand used to stop dead at 480px, leaving the sign-in card floating on
 * flat grey — a hard vertical seam with an empty three-quarters beside it.
 * That seam, not the absence of animation, was what read as flat.
 *
 * Now a single field spans the whole viewport and everything sits on it. The
 * drifting colour points (globals.css, 28–46s, under 8% travel) give it depth
 * without ever being perceived as movement, the field's warmth tracks the
 * hour, the dove draws itself once, and the verse rotates per load so the
 * page has a voice rather than a slogan.
 *
 * The field is full-bleed but the two columns are not. Once the seam went,
 * letting the pair span the whole viewport stopped reading as a two-column
 * layout: on a 1900px screen the verse hugged the far left, the card landed
 * at 63% with ~550px of nothing between them, and the margins disagreed —
 * 40px on the left against 490px on the right. Capping the pair and centring
 * it puts equal air on both sides and turns that void into a measured gutter,
 * so the asymmetry inside the composition reads as intent rather than drift.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const verse = pickAuthVerse();

  // Word-by-word entrance. A highlighted word is one beat and gets its
  // underline drawn once every word has landed.
  const before = words(verse.before, 0);
  const primary = before.next;
  const between = words(verse.between, primary + 1);
  const accent = between.next;
  const after = words(verse.after, accent + 1);
  const underlineAt = VERSE_START_MS + after.next * WORD_STAGGER_MS + 500;

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#fafafa] dark:bg-[#07060e]">
      {/* The field — one continuous background behind both columns, lit for
          the viewer's hour. Full-bleed; only the columns are capped. */}
      <AuthField />
      <LoginAmbient />

      {/* Pinned to the viewport corner, not the capped shell — chrome belongs
          to the window, not to the composition. */}
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle variant="full" />
      </div>

      {/* The pair. Capped and centred so the composition has equal margins. */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1200px]">
        {/* Brand column. No background of its own any more — it sits ON the
            field, so there is nothing to seam against.

            It appears at xl, not lg. At exactly 1024px the split left the card
            480px of brand plus a 544px column to centre in, which reads as
            cramped rather than composed; below xl the single centred card is
            the better layout, so the pair only engages once there is room for
            it. shrink-0 keeps the column at its stated width instead of
            quietly compressing the verse. */}
        <div className="hidden w-[480px] shrink-0 flex-col justify-between p-10 xl:flex">
          <div className="flex items-center gap-3">
            <KharisLogoIcon size={40} draw />
            <span className="text-lg font-bold uppercase tracking-widest text-gray-900 dark:text-white">
              Kharis Church
            </span>
          </div>

          <div className="space-y-8">
            <p className="text-[28px] font-light leading-snug text-gray-800 dark:text-white/90">
              {before.nodes}
              <em
                className="mo-load relative inline-block font-semibold not-italic text-[#5D3FD3] dark:text-[#a488ff]"
                style={{ ['--i' as string]: primary, animationDelay: `${VERSE_START_MS + primary * WORD_STAGGER_MS}ms` }}
              >
                {verse.primaryWord}
                <HandDrawn
                  d="M2 10 C 50 4, 120 14, 198 6"
                  viewBox="0 0 200 16"
                  stroke="#5D3FD3"
                  strokeWidth={4}
                  delay={underlineAt}
                  when="load"
                  className="pointer-events-none absolute -bottom-1 left-0 h-2.5 w-full"
                />
              </em>
              {between.nodes}
              <em
                className="mo-load relative inline-block font-semibold not-italic text-[#f8b537]"
                style={{ ['--i' as string]: accent, animationDelay: `${VERSE_START_MS + accent * WORD_STAGGER_MS}ms` }}
              >
                {verse.accentWord}
                <HandDrawn
                  d="M2 6 C 60 12, 130 2, 198 9"
                  viewBox="0 0 200 16"
                  stroke="#F8B537"
                  strokeWidth={4}
                  delay={underlineAt + 150}
                  when="load"
                  className="pointer-events-none absolute -bottom-1 left-0 h-2.5 w-full"
                />
              </em>
              {after.nodes}
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
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <Reveal className="w-full max-w-md space-y-6" delay={250} duration={1300}>
            <div className="flex items-center justify-center gap-2 xl:hidden">
              <KharisLogoIcon size={32} draw />
              <span className="text-lg font-bold uppercase tracking-widest text-primary">
                Kharis Church
              </span>
            </div>
            {children}
          </Reveal>
        </div>
      </div>
    </div>
  );
}
