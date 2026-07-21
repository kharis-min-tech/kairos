# Kairos design-sync notes

Living log for `packages/ui` (Modern Sanctuary) → claude.ai/design.

## Fixes applied this sync

- **[GENERAL] `.storybook/preview` decorator (`withThemeByClassName` from `@storybook/addon-themes`) crashes decorator bundling.** The converter's stub coverage doesn't include `@storybook/addon-themes`. Fix: sync-only `PreviewWrapper` identity component in `.design-sync/preview-shim.tsx`, wired via `cfg.extraEntries` + `cfg.provider`. Light theme is the DS default (no class marker; the decorator only toggled a `dark` class on ancestors), so the identity wrapper renders every preview in light — matches how the reference storybook renders the default too.
- **[GENERAL] Tailwind CSS not shipped from `packages/ui`.** `packages/ui` exports `./globals.css` as source (consumer apps run Tailwind). For the DS sync we need a compiled stylesheet — the build compiles Tailwind into `packages/ui/dist/globals.compiled.css` as part of `cfg.buildCmd`, wired via `cfg.cssEntry`. Fully self-contained on every re-sync.
- **`Colors` + `Typography` stories excluded** (`titleMap: {..: null}`) — reference stories showing the palette/type scale, not components.
- **`ConfirmDialog` + `Dialog` are portal components** (Radix Dialog): set `overrides.<Name>.cardMode: "single"` + `primaryStory: "Default"` so the grid card renders the primary story only in a portal-containing wrapper. Per-story compare still grades every story via `?story=<Export>`.
- **`ConfirmDialog` "Pending" story is `sb-error`** — the story sets `isProcessing: true` which causes the storybook renderer to bail before painting a root (both sides show "no shot"). Added to `overrides.ConfirmDialog.skip` since the interactive-loading state can't render statically. The other 3 stories (Default / Non Destructive / With Use Confirm) cover the trigger surface fully.

## Accepted `close` / substitutes

- **[FONT_MISSING] Inter font falls back to `system-ui`.** The DS tailwind config declares `['Inter', 'system-ui', 'sans-serif']` but no @font-face ships. Both the reference storybook and the compiled bundle render with `system-ui` — visually identical across the two sides, so `match` grades still hold. **Re-sync risk**: if consumers eventually load Inter but staging tests without it, designs will use the wrong metrics. To fix later: add Inter woff2 to `packages/ui/dist/fonts/` and wire via `cfg.extraFonts`.

## Re-sync risks (read on next sync)

- The `PreviewWrapper` shim is a passthrough. If the DS ever grows a theme provider consumers must wrap in (e.g. TokenProvider for CSS vars), replace the shim with a distillation of that provider — an identity wrap would silently regress themed components.
- `packages/ui/dist/globals.compiled.css` is a tailwind CLI output — dependencies of Tailwind (postcss plugins, autoprefixer) must remain installed. `.design-sync/build.log` will show any compile error.
- ConfirmDialog + Dialog are `cardMode: "single"` — only the primary story renders in the DS pane card; graded stories are captured per-story regardless. If a new story adds a distinct variant users should see, add it to `primaryStory` rotation or bump the DS card manually.
