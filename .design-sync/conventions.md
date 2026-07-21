# Modern Sanctuary — how to build with it

Component library for Kairos (church management app). All components are React 19, TypeScript, Tailwind CSS. This is a token-driven system: colors, radii, and spacing come from CSS custom properties defined in the shipped stylesheet, so light + dark themes work automatically without additional configuration.

## Wrapping and setup

**No provider is required.** Components have no shared React context — every primitive is self-contained. Import `styles.css` once at the app root; it transitively imports `_ds_bundle.css` (the compiled Tailwind utility classes and CSS custom properties for every design token).

**Dark mode is class-driven.** Add `class="dark"` to any ancestor (typically `<html>` or `<body>`) to opt that subtree into dark values. The DS defines both palettes on the same custom properties, so no restyling is needed — a `bg-background` container recolors itself when a `dark` ancestor exists.

## The styling idiom — semantic tokens over arbitrary values

Style with the DS's **semantic token classes** (below), NOT arbitrary hex values. Every semantic class resolves through a CSS custom property, so the class stays correct across light/dark and any future palette change. The `#5D3FD3` gradient and `#f8b537` gold are the two exceptions — those brand colors are used directly (e.g. `bg-[#5D3FD3]` or `text-[#f8b537]`) because they are the brand, not tokens.

**Color families to use:**

| Class family | Purpose |
|---|---|
| `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-secondary` | Surface tiers (page → card → subtle) |
| `bg-primary`, `bg-destructive`, `bg-accent`, `bg-success` | Semantic action colors |
| `text-foreground`, `text-muted-foreground`, `text-card-foreground` | Text on surfaces |
| `text-primary`, `text-destructive`, `text-accent-foreground` | Text on semantic colors |
| `border-border`, `border-input` | Borders — subtle by default (`border-border`), stronger for form fields (`border-input`) |
| `ring-ring`, `ring-primary/40` | Focus rings |
| `rounded-lg`, `rounded-md`, `rounded-sm` | Radii bound to `--radius` (0.25rem — sharp architectural corners per DESIGN.md) |

**Brand gradient** (primary buttons, hero surfaces):
```
bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] shadow-[#5d3fd3]/20
```

**Modern Sanctuary rules to honor:**
- Corners max 0.25rem — sharp, architectural. No pills except status chips.
- Focus rings use `#f8b537` (gold glow) at full opacity for inputs on focus.
- No 1px solid borders for sectioning — use tonal shifts between surface tiers (e.g. `bg-muted/50` inside `bg-card`).
- Icons: linear, 1.5px stroke — use `lucide-react`.

## Where the truth lives

- **Per-component API + usage examples**: `components/<group>/<Name>/<Name>.prompt.md` — the definitive reference for props and composition.
- **Component source (compiled JSX)**: `components/<group>/<Name>/<Name>.jsx`.
- **Component types**: `components/<group>/<Name>/<Name>.d.ts` — props interfaces.
- **Full token + utility vocabulary**: `_ds_bundle.css` — search here when unsure which class covers what you want.

## The 17 components in this DS

**Buttons & Actions** (2): `Button`, `Badge`
**Form Controls** (9): `Input`, `Textarea`, `Label`, `Checkbox`, `Select` (native), `CustomSelect` (rich dropdown — preferred over native), `NumberStepper`, `TimeSelect`
**Layout** (4): `Card` (+ `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`, `CardFooter`), `Dialog`, `Table`, `Tabs` (+ `TabsList`, `TabsTrigger`, `TabsContent`)
**Composites** (3): `ConfirmDialog` (imperative confirm modal via `useConfirm` hook), `DateSelect` (single date input with min/max), `PasswordStrength` (live strength meter)

Also exports: `cn` (className merger — `cn('bg-primary', condition && 'text-white')`), and `buttonVariants` / `badgeVariants` for extending the variant sets.

## One idiomatic build snippet

A member profile card with a heading, meta, action row, and a confirmation flow:

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, useConfirm } from '@kairos/ui';

export function MemberProfileCard({ member, onDeactivate }) {
  const { confirm, dialog } = useConfirm();

  async function handleDeactivate() {
    const ok = await confirm({
      title: `Deactivate ${member.name}?`,
      description: 'They will be hidden from active lists but can be reactivated.',
      confirmLabel: 'Deactivate',
      variant: 'destructive',
    });
    if (ok) onDeactivate();
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{member.name}</CardTitle>
            <CardDescription>{member.fellowship}</CardDescription>
          </div>
          <Badge variant={member.active ? 'default' : 'secondary'}>
            {member.active ? 'Active' : 'Archived'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{member.email}</p>
        <div className="flex gap-2">
          <Button size="sm">Edit</Button>
          <Button size="sm" variant="destructive" onClick={handleDeactivate}>
            Deactivate
          </Button>
        </div>
      </CardContent>
      {dialog}
    </Card>
  );
}
```

Everything renders inside `<Card>` (a surface tier), text uses `text-muted-foreground` for de-emphasis, spacing uses Tailwind's `space-y-*` / `gap-*` classes, and the destructive action goes through `useConfirm` for the standard destructive modal — no bespoke dialog wrapping.
