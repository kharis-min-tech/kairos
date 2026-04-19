# Design System Documentation: The Modern Sanctuary

## 1. Overview & Creative North Star
This design system is built to transform church administration from a utilitarian chore into a "Digital Sanctuary." Our Creative North Star is **The Modern Sanctuary**: an experience defined by architectural precision, structured clarity, and a sense of sacred order.

We move beyond the "SaaS template" look by rejecting standard grid-heavy layouts. Instead, we embrace **Balanced Composition** and **Tonal Depth**. The UI should feel like it was "carved" rather than "assembled," using clear breathing room to provide a professional and commanding presence for all content.

---

## 2. Color & Tonal Architecture
The palette is rooted in the high-contrast tension between `surface` (#f9f9f9) and `on-surface` (#1a1c1c), punctuated by the regal weight of `primary` (Royal Purple #5D3FD3) and the vibrant prestige of `secondary` (Vibrant Gold #f8b537).

### The "No-Line" Rule
To maintain a high-end editorial feel, designers are **prohibited from using 1px solid borders for sectioning.** Boundaries must be defined through:
- **Tonal Shifts:** Transitioning from `surface` to `surface-container-low`.
- **Negative Space:** Using a consistent 24px to 32px gap to define content blocks.

### Surface Hierarchy & Nesting
Treat the interface as a series of physical layers. We use the Material surface tiers to create nested depth:
1.  **Base:** `surface` (#f9f9f9) – The expansive floor of the application.
2.  **Sectioning:** `surface-container-low` (#f3f3f3) – Large areas for content grouping.
3.  **Elevation:** `surface-container-lowest` (#ffffff) – Individual cards or focal points.

### The "Glass & Gradient" Rule
Standard flat buttons are insufficient for the Kharis Church identity. 
- **Signature Textures:** Use a subtle linear gradient for main CTAs, transitioning from `primary` (#451ebb) to `primary-container` (#5d3fd3) at a 135-degree angle.
- **Glassmorphism:** Use `surface-container-lowest` at 80% opacity with a `20px` backdrop-blur for floating navigation or sidebars to create a "frosted glass" effect.

---

## 3. Typography
We utilize a clean, geometric sans-serif (Inter) to balance modernity with established authority.

*   **Display Scales (`display-lg` to `display-sm`):** Use these for high-impact moments—total monthly tithes, congregation growth, or welcoming headers. These should always be `on-surface` and set to a "Semi-Bold" weight with `-0.02em` tracking.
*   **Headline & Title:** These are your navigational anchors. Use `headline-sm` (1.5rem) for section titles to establish a clear hierarchy.
*   **Body & Labels:** `body-md` (0.875rem) is the workhorse for administration. Ensure a line-height of `1.6` to maintain readability in data-heavy views. 
*   **The Gold Accent:** Use `secondary` (#f8b537) sparingly for `label-md` elements to highlight "Verified" statuses or "Premium" member tiers.

---

## 4. Elevation & Depth
This system achieves hierarchy through **Tonal Layering** rather than structural lines.

### The Layering Principle
Depth is achieved by "stacking." A `surface-container-lowest` card placed on a `surface-container-low` background creates a soft, natural lift. This mimics the look of fine paper on a stone desk.

### Ambient Shadows
When an element must float (e.g., a modal or a dropdown), use an **Ambient Shadow**:
- **Color:** `on-surface` at 6% opacity.
- **Blur:** 24px - 40px.
- **Y-Offset:** 8px.
This creates a soft glow rather than a harsh drop shadow, maintaining the "High-End" aesthetic.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., input fields), use a **Ghost Border**: the `outline-variant` token (#c9c4d7) at **15% opacity**. Never use 100% opaque borders for decorative purposes.

---

## 5. Components

### Buttons
- **Primary:** `primary` background with `on-primary` text. Corners: `0.25rem` (4px). High-contrast and authoritative.
- **Secondary:** Transparent background with a `Ghost Border`. Text in `primary`.
- **Tertiary:** No background, no border. Text in `on-surface-variant`. Used for "Cancel" or "Go Back" actions.

### Cards & Lists
- **Forbid dividers.** To separate list items, use a `12px` vertical gap and a subtle background hover state using `surface-container-high` (#e8e8e8).
- **Asymmetry:** In dashboard cards, favor left-aligned typography with right-aligned status chips to create visual tension and interest.

### Input Fields
- **Geometry:** Sharp `0.25rem` corners. 
- **State:** On focus, the border shifts from a Ghost Border to a `secondary` (Gold) 1px border. This "Gold Glow" signifies the importance of the data being entered.

### Sophisticated Iconography
Use linear icons with a `1.5px` stroke weight. Icons should be `on-surface-variant` unless they are active, in which case they transition to `primary`.

### Specialized Admin Components
- **The Contribution Monolith:** A large `surface-container-lowest` card featuring `display-md` typography for financial tracking, using a subtle Gold-to-White gradient background.
- **The Grace Status Chip:** A pill-shaped component for membership status, using `secondary-container` with `on-secondary-container` text.

---

## 6. Do's and Don'ts

### Do
- **Do** prioritize clean negative space. If a layout feels "busy," remove borders and check tonal contrast.
- **Do** use `primary` (Purple) to guide the user’s eye toward the "Next Step" or "Success" action.
- **Do** use `secondary` (Gold) as a reward—use it for achievements, milestones, or high-level status.

### Don't
- **Don't** use standard Material Design "elevated" shadows. They feel too "Android" and not "Editorial."
- **Don't** use rounded corners larger than `0.25rem` (4px). We want sharp, architectural lines.
- **Don't** use high-contrast dividers between list items. Use whitespace or tonal shifts instead.
- **Don't** use pure black (#000000) for text. Always use `on-surface` (#1a1c1c) to keep the look sophisticated and readable.