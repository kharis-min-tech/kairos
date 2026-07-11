# @kairos/ui — Modern Sanctuary

Design-system primitives for Kairos and adopting teams. Built on React 19, Tailwind
CSS, Radix UI, and `class-variance-authority`. Fully typed. Light + dark theme aware.

- **Design principles**: see [`DESIGN.md`](../../DESIGN.md) at the repo root.
- **Component reference**: see [`docs/DESIGN-COMPONENTS.md`](../../docs/DESIGN-COMPONENTS.md).
- **Live visual catalog**: run Storybook locally (`npm run storybook`) or visit the
  deploy URL — see [Storybook](#storybook) below.

## What's inside

**16 components in `src/components/`:**

Primitives (13): `Badge` · `Button` · `Card` (+ `CardHeader`, `CardContent`,
`CardFooter`, …) · `Checkbox` · `CustomSelect` · `Dialog` (+ Radix parts) ·
`Input` · `Label` · `NumberStepper` · `Select` (+ parts) · `Table` (+ parts) ·
`Tabs` (+ parts) · `Textarea` · `TimeSelect`

Composites (3): `ConfirmDialog` (+ `useConfirm` hook) · `DateSelect` ·
`PasswordStrength`

Plus:

- `tokens.json` — portable design tokens (colors, radii, shadows, typography).
- `globals.css` — CSS variables for light + dark themes.
- `cn()` — the standard Tailwind class merger.

## Install (Kairos monorepo)

Already wired as a workspace dependency in `apps/web/package.json`. No install
needed inside the repo.

```tsx
import { Button, Card, Input } from '@kairos/ui';
```

## Install (external project)

The package is not yet published to npm. To adopt in another project today:

1. **Vendor the source** — copy `packages/ui/src/` into your project (e.g.
   `src/design-system/`) and adjust the `cn` import path. Peer-depend on
   `react@^19`, `tailwindcss@^3.4`, `class-variance-authority`, `clsx`,
   `tailwind-merge`, `lucide-react`, and `@radix-ui/react-dialog`.
2. **Wire the tokens** — either:
   - Copy `apps/web/tailwind.config.ts`'s `theme.extend` block into your Tailwind
     config, and copy `apps/web/src/app/globals.css` into your app's global stylesheet, **or**
   - Import `tokens.json` and generate your own bridge (see [Tokens](#tokens)).
3. **Wrap your app** — import `globals.css` at the root and add the Inter font
   variable (`--font-inter`) via `next/font/google` or your loader of choice.

A published npm version is on the roadmap — until then, vendoring is the intended
adoption path.

## Usage

```tsx
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label } from '@kairos/ui';

export function SignInCard() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" />
        </div>
        <Button className="w-full">Continue</Button>
      </CardContent>
    </Card>
  );
}
```

Every primitive is a **client-safe React 19 component** — no server/client boundary
issues. Form primitives (`Input`, `Textarea`, `Checkbox`, `NumberStepper`, `Select`)
forward refs so React Hook Form's `register()` works directly.

## Tokens

`tokens.json` is the portable snapshot:

```json
{
  "color": {
    "primary": {
      "600": "#5d3fd3",
      "gradient": { "from": "#451ebb", "to": "#5d3fd3", "angle": "135deg" }
    },
    "accent":  { "400": "#f8b537" }
  }
}
```

If your project uses a different styling tool, generate a bridge:

- **Tailwind** — use `apps/web/tailwind.config.ts` as a template.
- **CSS variables** — use `apps/web/src/app/globals.css` as a template.
- **Style Dictionary / Theo** — point at `tokens.json` and emit whatever your
  build needs. The JSON follows a simple grouped-by-scale shape (`color.primary.600`,
  `color.accent.400`, etc.).

## Theming

Modern Sanctuary is theme-aware out of the box. The dark variant activates when
`html` (or any ancestor) has the class `dark`.

To wire a theme toggle, use `next-themes` (or your framework equivalent):

```tsx
import { ThemeProvider } from 'next-themes';

<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>
```

The `theme-toggle` component in `apps/web/src/components/theme-toggle.tsx` shows
the Kairos implementation — it's not exported from this package because it
depends on `next-themes` (a framework choice).

## Storybook

Every primitive has a story showing every variant and state, in both light and
dark modes.

```bash
cd packages/ui
npm run storybook       # dev, http://localhost:6006
npm run build-storybook # static build → storybook-static/
```

The deployed URL for the current handoff is in the internal handoff note — ask
the Kharis engineering lead for access.

## Testing

Components have co-located Vitest tests. To run:

```bash
npm --workspace @kairos/ui test
```

Tests use `@testing-library/react` and target user-visible behavior (variant
classes applied, refs forwarded, keyboard interactions).

## Contributing

Add a new primitive:

1. Create `src/components/<name>.tsx` with a typed props interface. Forward refs
   on any form primitive.
2. Add a co-located test file `src/components/<name>.test.tsx`.
3. Add a Storybook story at `src/stories/<Name>.stories.tsx`.
4. Re-export from `src/index.ts`.
5. Update `docs/DESIGN-COMPONENTS.md` at the repo root.

See the [`packages/ui/CLAUDE.md`](./CLAUDE.md) for internal contributor notes.

## License

Private — Kharis Church internal. External adoption by invitation.
