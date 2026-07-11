# Kairos Design System — Modern Sanctuary

> **Handoff guide.** This document is the design north star. For component APIs and
> variants, see [`docs/DESIGN-COMPONENTS.md`](docs/DESIGN-COMPONENTS.md). For a live
> visual reference of every primitive, see the Storybook deploy (link once published
> — see `packages/ui/README.md`).

## Overview

Kairos is a church operations console. Its design system — **Modern Sanctuary** —
is calm, structured, and premium: architectural spacing, layered surfaces,
restrained color, and confident purple/gold emphasis. It is admin-tool-first, not
marketing-first — clarity, workflow efficiency, and role-aware density come before
visual novelty.

The system ships as a monorepo package (`@kairos/ui`) and a set of design tokens
(`packages/ui/tokens.json`, `apps/web/src/app/globals.css`). Consuming apps get
16 typed React components, a Tailwind token layer, and a small set of composition
rules.

## What's included

- **13 shared primitives** in `@kairos/ui` — badge, button, card, checkbox,
  custom-select, dialog, input, label, number-stepper, select, table, tabs,
  textarea, time-select
- **3 portable composites** in `apps/web/src/components/` — confirm-dialog,
  date-select, password-strength
- **Design tokens** — colors (primary + gold ladders + semantic surfaces),
  radii, shadows, typography scale, spacing
- **CSS variables** — `--primary`, `--accent`, `--background`, etc., theme-aware
  (light + dark) via a `.dark` class

Not part of the exported system (but present in `apps/web`): domain-aware
compositions like `member-avatar`, `nb-stage-chip`, and the `theme-toggle` (which
depends on Next.js + `next-themes`). Those are Kairos-specific and would not
transfer cleanly to another product.

## Color

The Modern Sanctuary palette is centered on royal purple with gold accents.

| Token | Hex | Purpose |
|---|---|---|
| Primary 600 (default) | `#5D3FD3` | Primary actions, links, focus rings |
| Primary gradient | `from-[#451ebb] to-[#5d3fd3]` (135°) | Primary button, brand surfaces |
| Accent 400 (gold) | `#f8b537` | Milestones, verified badges, focus glow |
| Success | `#10b981` (600 = `#059669`) | Positive state, growth metrics |
| Destructive / Error | `#e11d48` | Danger actions, error state |
| Base surface | `#fafafa` (light) / `#0a0a0a` (dark) | Page background |
| Card surface | `#ffffff` (light) / `#141414` (dark) | Elevated content |
| Muted surface | `#f3f3f3` (light) / `#1c1c1c` (dark) | Sectioning without dividers |
| On-surface | `#1c1c1c` (light) / `#f0f0f0` (dark) | Primary text — never pure black |
| On-surface-muted | `#737373` | Labels, captions |

Full 50 → 950 ladders for primary, accent, success, and error are in
`packages/ui/tokens.json` and `apps/web/tailwind.config.ts`.

**Rules:**

- Never use pure black (`#000`) — always `#1a1c1c` or lighter.
- Do not use navy or blue as a primary color anywhere in the app.
- Charts and multi-series views should mix primary, gold, success, error, and a
  neutral cool (sky) — not purple-on-purple.
- Old palette (`#6D28D9` / `#D97706`) is **deprecated** — do not add new usages.
  Migrate inline when touching a file.

## Surface Model

Modern Sanctuary layers surfaces tonally rather than via borders:

```
┌─ background (#fafafa) ────────────────────┐
│  ┌─ muted (#f3f3f3) ───────────────────┐ │
│  │  ┌─ card (#ffffff) ambient shadow ┐ │ │
│  │  │        content                  │ │ │
│  │  └─────────────────────────────────┘ │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

- Page → `background`
- Sectioning within a page → `muted` (no divider needed)
- Elevated content (cards, dialogs, popovers) → `card` + ambient shadow
- App chrome / sidebar → semi-transparent white with `backdrop-blur`, or
  near-black in dark mode

**Borders** are permitted for form controls, table cells, accessibility outlines,
and dense data controls. **Not** for section division — use spacing and tonal
shift instead.

## Shape & Density

- **Radius**: `--radius: 0.25rem` (4px). Sharp, architectural.
  - `rounded-lg` = `--radius` (4px)
  - `rounded-md` = `calc(--radius - 2px)` (2px)
  - `rounded-sm` = `calc(--radius - 4px)` (0px)
  - Pills (`rounded-full`) are reserved for status chips and avatars only.
- **Nesting**: do not put cards inside cards. Use tabs, tonal shifts, or
  side-by-side grids.
- **Density**: dashboard views should be dense but readable — reduce padding
  before reducing font size. Landing-page hero composition doesn't belong inside
  the authenticated app.

## Typography

- **Family**: Inter via `--font-inter` CSS variable, system fallback.
- **Scale** (Tailwind defaults, no tracking overrides beyond `tracking-tight` on
  large numerals):
  - `text-3xl` — dashboard metrics, page titles
  - `text-xl` — section headings
  - `text-base` — body copy
  - `text-sm` — labels, table cells
  - `text-xs` — captions, chips
- **Weight**: `font-medium` for buttons, `font-semibold` for headings and labels.
- **No custom letter-spacing** beyond Tailwind defaults.

## Shadows

Only "ambient" — soft, subtle, colored by on-surface at 6% opacity:

- `shadow-ambient` — `0 8px 24px rgba(26, 28, 28, 0.06)`
- `shadow-ambient-lg` — `0 8px 40px rgba(26, 28, 28, 0.06)`

No Material-style drop shadows. No neon glows except the gold focus ring.

## Focus & Interaction

- **Focus ring**: gold (`#f8b537`), 2px, 2px offset from surface — the "Gold Glow."
- **Hover**: primitives shift bg by 5–10% opacity or use `-primary/80` alpha.
- **Disabled**: `opacity: 0.5`, `pointer-events: none`.
- **Loading**: keep control at stable size; use `Loader2` from lucide with `animate-spin`.

## Icons

- **Library**: `lucide-react` only.
- **Style**: linear, 1.5px stroke.
- **Size**: match `text-base` line-height when inline; 16px in dense controls, 20px in buttons.

## Charts

- **Library**: `recharts`.
- **Colors**: use the Modern Sanctuary palette, not chart-default red/blue.
  Series order: primary → gold → success → error → sky.
- **Grid**: minimal — `stroke="#f0f0f0"` in light mode, `stroke="#262626"` in dark.
- **Tooltips**: use `card` surface + ambient shadow. Never default recharts style.

## Components

See [`docs/DESIGN-COMPONENTS.md`](docs/DESIGN-COMPONENTS.md) for the full
component reference (props, variants, examples).

### Composition rules

- **Buttons**: `Button` with `variant`. Primary = gradient (default). Never a
  raw `<button>` with hand-rolled styles.
- **Form controls**: `Input`, `Textarea`, `Label`, `Checkbox`, `NumberStepper`.
  All forward refs so React Hook Form can register them.
- **Date/time**: **`DateSelect` is the ONLY date input in Kairos.** Native
  `<input type="date">` is forbidden. Same rule for `TimeSelect`.
- **Dropdowns**: `CustomSelect` for keyboard-navigable custom dropdowns; `Select`
  for simple native-style select (styled). No raw native `<select>`.
- **Modals**: `Dialog` (built on `@radix-ui/react-dialog`). For confirmations,
  the app-local `ConfirmDialog` wraps `Dialog` with title/message/action props.
- **Tables**: `Table` with `TableHeader`, `TableRow`, `TableCell`. Whitespace and
  hover states before dividers.
- **Status chips**: `Badge`. Variant maps to semantic color (default, secondary,
  destructive, outline).
- **Tabs**: `Tabs` with `TabsList`, `TabsTrigger`, `TabsContent`.

## App Shell

The authenticated app shell:

- Left sidebar on desktop (translucent, `backdrop-blur`), slide-out on mobile.
- Role-filtered nav items (`useCapabilities()` gates render).
- User/profile/settings controls at sidebar footer.
- `activeRole` from auth store drives page-level branching (member vs admin views).

New pages fit inside this shell. Do not build separate navigation systems.

## Page Patterns

- **Dashboards**: stat row → primary chart → secondary lists/CTAs.
- **CRUD lists**: header + primary action → filter row → table → pagination.
- **CRUD forms**: concise header → sectioned form → primary action anchored near
  final decision point (bottom-right or a sticky footer on long forms).
- **Detail pages**: header summary → tabs for domains → role-aware actions.
- **Approval/review**: entity identity → status → requested change → explicit
  approve/reject buttons.
- **Import/export**: expected schema → upload state → error summary → result counts.
- **Auth pages**: may be more spacious and brand-forward. Still use the same
  purple/gold vocabulary — no unrelated illustration styles.

## Accessibility

- Text does not overflow buttons, chips, cards, or sidebars on mobile.
- Controls maintain stable sizes across loading states so layouts don't shift.
- Semantic `<button>` and `<a>` — no divs-as-buttons.
- `aria-label` or `title` on icon-only controls.
- Focus is visible in both light and dark modes (gold ring, 2px offset).
- Contrast: text on surface meets WCAG AA at every layer.

## Forbidden for new work

- Native `<input type="date">` — use `DateSelect`.
- Native `<select>` where a shared select fits — use `CustomSelect` or `Select`.
- Navy dashboard headers or navy anywhere as a primary color.
- 1px solid dividers as the main sectioning device — use tonal shifts.
- Marketing-style rounded hero cards inside operational pages.
- Hard-coded colors that duplicate existing tokens without cause.
- Old palette (`#6D28D9`, `#D97706`, `purple-700`, `amber-400`) — deprecated.

## Consuming the system

For install and setup, see [`packages/ui/README.md`](packages/ui/README.md). For
per-component props, variants, and examples, see
[`docs/DESIGN-COMPONENTS.md`](docs/DESIGN-COMPONENTS.md). For a live visual
catalog, run Storybook locally (`cd packages/ui && npm run storybook`) or visit
the deploy URL in the UI package README.

## Ownership & Contributions

- Design tokens live in `packages/ui/tokens.json` (source) and
  `apps/web/tailwind.config.ts` (Tailwind bridge) — keep both in sync when
  bumping a value.
- New primitives go in `packages/ui/src/components/` with a co-located test and
  a Storybook story.
- Domain-aware compositions belong in `apps/web/src/components/`, not the UI
  package.
- A wider palette or type-scale shift is a design decision — propose it before
  implementing.
