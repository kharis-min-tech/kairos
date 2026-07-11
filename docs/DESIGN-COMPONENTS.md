# Kairos Component Reference

Every primitive in `@kairos/ui` and the three portable composites in
`apps/web/src/components/`. Companion to [`DESIGN.md`](../DESIGN.md) (principles)
and the Storybook (live visuals — see `packages/ui/README.md`).

Legend:

- 🎨 = variants via `class-variance-authority` (`cva`)
- 🔀 = forwards ref
- 🎯 = Radix-based
- 📦 = shared primitive (`@kairos/ui`)
- 🧩 = app-local composite (`apps/web/src/components/`)

---

## Layout & Container

### `Card` 📦 🔀

Elevated surface with ambient shadow. The workhorse container.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@kairos/ui';

<Card>
  <CardHeader>
    <CardTitle>Fellowship</CardTitle>
    <CardDescription>Central London Sunday Group</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter>…</CardFooter>
</Card>
```

**Parts:** `Card`, `CardHeader`, `CardTitle` (h3, `text-2xl font-semibold`),
`CardDescription`, `CardContent`, `CardFooter`. All accept `className` and forward
refs.

**Rules:** never nest a `Card` inside another `Card`. Use `Tabs` or a grid instead.

---

### `Table` 📦 🔀

Auto-overflow-wrapped table. Composable parts.

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@kairos/ui';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead className="text-right">Attendance</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Alice</TableCell>
      <TableCell className="text-right">92%</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**Parts:** `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`,
`TableCell`, `TableCaption`. Rows get hover state automatically.

**Rules:** prefer whitespace + hover over 1px dividers. Right-align numeric columns.

---

### `Tabs` 📦

Keyboard-navigable tab list with panels. Custom implementation (not Radix) — arrow
keys, Home/End, and space/enter all wire correctly.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@kairos/ui';

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="members">Members</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">…</TabsContent>
  <TabsContent value="members">…</TabsContent>
</Tabs>
```

**Props (Tabs):** `value?`, `defaultValue?`, `onValueChange?`, `className?`.

**Rules:** put static paths before dynamic ones. Every `TabsTrigger` needs a matching
`TabsContent`.

---

### `Dialog` 📦 🎯 🔀

Modal built on `@radix-ui/react-dialog`. Wraps overlay + content in the design-system
surface.

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@kairos/ui';

<Dialog>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete fellowship?</DialogTitle>
      <DialogDescription>This can be undone within 30 days.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
      <Button variant="destructive">Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Parts:** all Radix parts re-exported; `DialogContent` styled with the Modern
Sanctuary surface + ambient shadow. Close button (X) rendered automatically.

**Rules:** always include a `DialogTitle` — Radix requires it for screen readers.

---

## Buttons & Actions

### `Button` 📦 🎨 🔀

Primary action. Gradient default, plus destructive / outline / secondary / ghost /
link / success variants.

```tsx
import { Button } from '@kairos/ui';

<Button>Save</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost" size="icon"><Trash2 /></Button>
```

**Variants:** `default` (gradient), `destructive`, `outline`, `secondary`, `ghost`, `link`, `success`.

**Sizes:** `default` (h-10), `sm` (h-9), `lg` (h-11), `icon` (h-10 w-10 square).

**Props:** all `HTMLButtonElement` attributes + `variant` + `size`.

**Rules:** primary CTA per page = gradient default. Do not stack two gradients side-by-side.

---

### `Badge` 📦 🎨

Rounded pill for status labels.

```tsx
import { Badge } from '@kairos/ui';

<Badge>Active</Badge>
<Badge variant="secondary">Draft</Badge>
<Badge variant="destructive">Expired</Badge>
<Badge variant="outline">Pending</Badge>
```

**Variants:** `default`, `secondary`, `destructive`, `outline`.

**Rules:** badge text is metadata, not a CTA. If it's clickable, use `Button` instead.

---

## Form Controls

### `Input` 📦 🔀

Standard text input. Height 40px (`h-10`), rounded-lg, gold focus ring.

```tsx
import { Input, Label } from '@kairos/ui';

<Label htmlFor="email">Email</Label>
<Input id="email" type="email" placeholder="you@example.com" />
```

**Props:** all `HTMLInputElement` attributes. Ref forwarded — RHF `register()` works.

**Rules:** always pair with a `Label`. Use `type` correctly (`email`, `tel`, `password`, `search`, `url`) for autofill and mobile keyboards.

---

### `Textarea` 📦 🔀

Multi-line input. Min-height 80px.

```tsx
import { Textarea } from '@kairos/ui';

<Textarea rows={4} placeholder="Notes…" />
```

**Props:** all `HTMLTextAreaElement` attributes.

---

### `Label` 📦 🔀

Semibold, `text-sm`, disabled-state aware.

```tsx
import { Label } from '@kairos/ui';

<Label htmlFor="fellowship">Fellowship</Label>
```

**Props:** all `HTMLLabelElement` attributes.

---

### `Checkbox` 📦 🔀

Boolean input styled to match the design system.

```tsx
import { Checkbox } from '@kairos/ui';

<Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
```

**Props:** all `HTMLInputElement` attributes except `type` (forced to `checkbox`).

> **Known drift**: internal implementation uses hardcoded `#6D28D9` for checked
> state — that's the old palette. Backlog item — will migrate to `#5D3FD3` in a
> future pass.

---

### `NumberStepper` 📦

Compact +/- stepper. Great for probation days, min/max group sizes, etc.

```tsx
import { NumberStepper } from '@kairos/ui';

<NumberStepper value={days} onValueChange={setDays} min={7} max={90} step={7} suffix="d" />
```

**Props:** `value: number`, `onValueChange: (n: number) => void`, `min?`, `max?`,
`step?`, `suffix?` (unit string), `disabled?`, `ariaLabel?`, `className?`.

---

### `Select` 📦 🔀

Styled native `<select>`. Fastest to reach for when you don't need custom rendering.

```tsx
import { Select } from '@kairos/ui';

<Select value={role} onValueChange={setRole}>
  <option value="admin">Admin</option>
  <option value="member">Member</option>
</Select>
```

**Props:** all `HTMLSelectElement` attributes + `onValueChange?` (called with the string
value directly).

**Rules:** if you need option icons, badges, or custom layout, use `CustomSelect` instead.

---

### `CustomSelect` 📦

Keyboard-navigable custom dropdown built with portal + auto-position. Match `Input`
size by default; `size="sm"` for toolbars.

```tsx
import { CustomSelect } from '@kairos/ui';

<CustomSelect
  value={branchId}
  onValueChange={setBranchId}
  options={branches.map(b => ({ value: b.id, label: b.name }))}
  placeholder="Choose a branch"
/>
```

**Props:** `value: string`, `onValueChange: (v: string) => void`, `options: { value; label; disabled? }[]`, `placeholder?`, `size?: 'sm' | 'default'`, `disabled?`, `id?`, `className?`.

**Rules:** always the choice for dropdowns in forms. Options list may be dynamic.

---

### `TimeSelect` 📦

24-hour time picker built from two `CustomSelect`s (hours + minutes).

```tsx
import { TimeSelect } from '@kairos/ui';

<TimeSelect value={time} onValueChange={setTime} minuteStep={15} allowEmpty />
```

**Props:** `value: string` (`"HH:MM"` or `""`), `onValueChange: (v: string) => void`,
`minuteStep?` (default 5), `allowEmpty?`, `disabled?`, `className?`.

---

### `DateSelect` 🧩

The **only** date picker in Kairos. Popover calendar with day/month/year views.
Two visual variants: input (form-shaped) and pill (toolbar-shaped).

```tsx
import { DateSelect } from '@/components/date-select';

<DateSelect value={date} onChange={setDate} variant="input" />
<DateSelect value={date} onChange={setDate} variant="pill" />
```

**Value:** ISO `YYYY-MM-DD` string, or `""` for unset. Always controlled.

**Rules:** never use `<input type="date">`. This is the entire replacement.

*Currently in `apps/web/src/components/`; may migrate into `@kairos/ui` in a future
pass.*

---

## Composites

### `ConfirmDialog` 🧩

Wraps `Dialog` with title / description / confirm / cancel props. Includes an
`isPending` state for optimistic UI.

```tsx
import { ConfirmDialog } from '@/components/confirm-dialog';

<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Delete fellowship?"
  description="This action can be undone within 30 days."
  variant="destructive"
  confirmLabel="Delete"
  isPending={mutation.isPending}
  onConfirm={() => mutation.mutate()}
/>
```

**Props:** `open`, `onOpenChange`, `title`, `description?` (ReactNode),
`confirmLabel?` (default "Confirm"), `cancelLabel?` (default "Cancel"),
`variant?: 'default' | 'destructive'`, `isPending?`, `onConfirm`.

---

### `PasswordStrength` 🧩

Live strength meter with per-requirement checklist. Used on signup, reset, and
change-password flows.

```tsx
import { PasswordStrength } from '@/components/password-strength';

<PasswordStrength password={password} />
```

**Props:** `password: string`.

Checks: min 8 chars, one uppercase, one number, one special. Strength bar colors
green at level 4.

---

## Not part of the exported system

Present in `apps/web/src/components/` but Kairos-specific and not intended for
adoption:

- `member-avatar` — depends on `Member` type from `@kairos/types`
- `nb-stage-chip` — depends on `NewBelieverStage` enum from `@kairos/types`
- `theme-toggle` — depends on `next-themes` (Next.js integration)
- `consent-banner` — depends on the internal consent record system
- `fellowship-map` — Kairos-specific map component

Vendor these only if you want to adapt them; they're not "design system" surfaces.

---

## Change log

- **v1.0** (2026-07-11) — first handoff catalog. 13 primitives + 3 composites.
