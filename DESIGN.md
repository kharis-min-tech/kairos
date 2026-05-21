# Kairos Design System

## Creative Direction

Kairos should feel like a modern church operations console: calm, structured, premium, and fast to scan. The product is an admin tool first, not a marketing site. Prioritize clarity, efficient workflows, and role-aware information density.

The visual north star is **The Modern Sanctuary**: architectural spacing, layered surfaces, restrained color, and confident purple/gold emphasis.

## Color Tokens

Use the app tokens in `apps/web/src/app/globals.css` and shared UI components as the implementation source.

- Primary purple: `#6D28D9`
- Deep purple: `#451ebb` / `#5d3fd3`
- Dark header purple: `#3b0764` / `#4c1d95`
- Accent gold: `#D97706` / `#f8b537`
- Success emerald: `#059669`
- Error rose: `#E11D48`
- Base surface: near-white `#f9f9f9`
- Primary text: near-black `#1a1c1c`

Avoid navy headers and one-note purple-only screens. Charts and status views should include purple, gold, emerald, rose, and a cool secondary such as sky where useful.

## Surface Model

Use tonal layering instead of heavy outlines:

- Page background: `background`.
- App chrome/sidebar: translucent white or near-black with `backdrop-blur`.
- Content surfaces: `card`, `muted`, and `secondary`.
- Floating elements: ambient shadow, not harsh drop shadows.

Borders are allowed for inputs, tables, accessibility states, and dense data controls. Avoid decorative section dividers; prefer spacing and tonal shifts.

## Shape And Density

- Shared components currently use compact radii, usually `rounded`, `rounded-md`, or `rounded-lg`.
- Keep cards and controls at 8px radius or less unless matching an existing auth/onboarding surface.
- Do not nest cards inside cards. Use sections, grids, tabs, or dialogs instead.
- Admin/dashboard views should be dense but readable; avoid landing-page hero composition inside the authenticated app.

## Typography

- Use Inter/system sans through the existing Tailwind setup.
- Dashboard metrics can use `text-3xl` with tight tracking.
- Panel/card headings should usually be `text-base` to `text-xl`.
- Labels are small, semibold, and often muted.
- Do not use negative letter spacing beyond existing Tailwind defaults.

## Components

- Buttons: use `@kairos/ui` `Button` when possible. Primary actions use the purple gradient already defined in the shared button.
- Inputs: use `@kairos/ui` `Input`, `Textarea`, and labels. Focus states should use purple or gold accents.
- Date inputs: always use `apps/web/src/components/date-select.tsx`.
- Dropdowns: use `CustomSelect` or the shared select primitives. Do not add native `<select>` for new UI.
- Tables/lists: use whitespace, row hover states, and muted backgrounds before adding dividers.
- Icons: use lucide icons for new controls when practical; keep local inline SVGs only when editing a cluster that already uses them.
- Charts: use Recharts and the established multi-color palette.

## App Shell

The authenticated app uses:

- Left sidebar on desktop.
- Mobile slide-out navigation.
- Role-filtered nav items.
- User/profile/settings controls at the bottom of the sidebar.
- `activeRole` from auth state for route behavior.

New pages should fit this shell instead of creating separate navigation systems.

## Page Patterns

- Dashboards: stat row first, then charts/lists/actions.
- CRUD pages: concise header, form sections, primary action anchored near the final decision point.
- Detail pages: header summary, tabs for major domains, then role-aware actions.
- Approval/review pages: show entity identity, status, requested change, and explicit approve/reject actions.
- Import/export pages: show expected CSV shape, upload state, partial error summary, and resulting counts.

## Auth Pages

Auth pages may be more spacious and brand-forward than the app shell. They should still use the same purple/gold vocabulary and avoid unrelated illustration styles.

## Accessibility And Responsiveness

- Text must not overflow buttons, chips, cards, or sidebars on mobile.
- Keep controls at stable sizes so loading states do not shift layouts.
- Use semantic buttons and links.
- Add `aria-label`/`title` for icon-only controls.
- Preserve readable contrast in light and dark modes.

## Forbidden For New Work

- Native date inputs.
- Native dropdowns where shared select components fit.
- Navy dashboard headers.
- Decorative 1px section dividers as the main layout device.
- Large rounded marketing cards inside operational pages.
- Hard-coded colors that duplicate existing tokens without a reason.
