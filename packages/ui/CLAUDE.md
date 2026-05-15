# packages/ui — Shared design-system components

This package is the source for primitives used by `apps/web`. App-specific compositions live in `apps/web/src/components/`. The design system is **Modern Sanctuary** — see root `DESIGN.md` for the full spec.

## Layout

```
src/
  components/
    button.tsx + button.test.tsx
    card.tsx + card.test.tsx
    input.tsx + input.test.tsx
    custom-select.tsx + custom-select.test.tsx
    date-select  — (LIVES IN apps/web/src/components/date-select.tsx — see below)
    badge.tsx, dialog.tsx, label.tsx, select.tsx, table.tsx,
    textarea.tsx, number-stepper.tsx, time-select.tsx
  lib/                  utility helpers (cn, variant builders)
  globals.css           CSS variables (--primary, --accent, etc.) — see palette note
  index.ts              barrel export — every primitive must be re-exported
```

> `DateSelect` is currently in `apps/web/src/components/date-select.tsx` (NOT in this package). The DESIGN.md mandates it as the *only* date input — when extracting it here in future, keep `apps/web` re-export working.

## What belongs here vs. apps/web

**In `@kairos/ui`**: primitives that are agnostic of the domain (Button, Input, Card, Dialog, custom select with our visual rules). Anything I'd ship to a different Kharis product without changes.

**In `apps/web/src/components/`**: domain-aware compositions (MemberAvatar, ThemeToggle, dashboard chrome). Pages compose these freely.

If unsure: does the file import from `@kairos/types`, `@kairos/api-client`, or hit the api singleton? It belongs in `apps/web`. Pure presentation? `@kairos/ui`.

## Modern Sanctuary palette

`DESIGN.md` is authoritative:

- Primary: `#5D3FD3` (royal purple)
- Primary gradient: `from-[#451ebb] to-[#5d3fd3]` at 135°
- Secondary / Gold: `#f8b537` (used sparingly for milestones, verified badges, focus rings)
- Surface tiers: `#f9f9f9` (base) → `#f3f3f3` (sectioning) → `#ffffff` (elevation)
- on-surface text: `#1a1c1c` (never pure black)
- on-surface-variant: `#c9c4d7` at 15% opacity for "Ghost Borders"

**Design tokens lag the spec.** `globals.css` still defines HSL vars for the older palette (`#6D28D9` / `#D97706`). New primitives should either:

1. Use arbitrary Tailwind values matching Modern Sanctuary directly (`bg-[#5D3FD3]`), or
2. Bind to the CSS vars and accept that for now they render close-but-not-exact (`bg-primary`).

A token swap is a wide-blast-radius change — propose it as a `/gap-fix tailwind-palette` pass before doing it.

## Visual rules (from DESIGN.md)

- **No 1px solid borders for sectioning.** Use tonal shifts between surface tiers, or 24–32px negative space.
- **Corners**: `0.25rem` (4px) maximum. Sharp, architectural. No pills *except* status chips.
- **Focus rings**: Gold (`#f8b537`) at full opacity — the "Gold Glow". Inputs lift from Ghost Border to gold on focus.
- **Shadows**: Ambient — `on-surface` at 6% opacity, 24–40px blur, 8px y-offset. Never harsh Material drop shadows.
- **Buttons**: primary = gradient (`from-[#451ebb] to-[#5d3fd3]`) with shadow `shadow-[#5d3fd3]/20`. Secondary = transparent + Ghost Border + `#5D3FD3` text. Tertiary = no chrome, `on-surface-variant` text.
- **Lists**: no dividers between items. 12px vertical gap, optional hover surface tier.
- **Icons**: linear, 1.5px stroke. Use lucide-react.

## Component rules

- **Always TypeScript + props interface.** No PropTypes, no untyped.
- **Forward refs** on form primitives so RHF's `register` works: `React.forwardRef<HTMLInputElement, InputProps>(...)`.
- **`cn()` from `src/lib/utils.ts`** for composing class names — never `className={`${a} ${b}`}`.
- **Variants** via `class-variance-authority` (`cva`) on Button-like primitives.
- **Tests are mandatory** for any primitive that has state, variants, or refs. Co-locate `x.test.tsx` next to `x.tsx`.
- **Re-export from `src/index.ts`.** A primitive that isn't exported isn't real.

## Things commonly gotten wrong

- Adding a domain-aware component here (one that knows about Members or Fellowships).
- Using `cursor: pointer` on a `<button>` (it's the default; doesn't need declaration).
- Hardcoding pixel values instead of Tailwind classes — breaks dark mode and density variants.
- Skipping the test file because "it's just a wrapper" — wrappers are exactly where ref-forwarding bugs hide.
