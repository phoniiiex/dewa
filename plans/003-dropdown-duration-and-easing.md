# 003 — Fix UI component animation duration (100ms → 150–200ms) with strong ease-out

- **Status**: TODO
- **Commit**: 61f09e2
- **Severity**: MEDIUM
- **Category**: Easing & Duration
- **Estimated scope**: 5 files in src/components/ui/

## Problem

All shadcn/Base UI floating elements — dropdown menus, selects, popovers, comboboxes, and tooltips — share `duration-100` (100ms) as their animation duration. This is paired with the default Tailwind `animate-in` easing which is a generic `ease` curve, not the strong `ease-out` token the design system defines.

At 100ms with a weak easing curve, dropdowns and popovers feel like they "pop" abruptly with no entry feel. The AUDIT.md target for dropdowns/selects is **150–250ms ease-out**.

The five affected components:

```
src/components/ui/dropdown-menu.tsx:44  — duration-100
src/components/ui/dropdown-menu.tsx:138 — duration-100
src/components/ui/select.tsx:86         — duration-100
src/components/ui/popover.tsx:40        — duration-100
src/components/ui/combobox.tsx:113      — duration-100
src/components/ui/tooltip.tsx:53        — (no duration class — defaults to 150ms, but easing is generic)
```

## Target

Change `duration-100` → `duration-150` on all floating content panels. Add an explicit ease-out easing override so the enter animation starts fast (responsive) and decelerates naturally.

The Tailwind `ease-out` class maps to `cubic-bezier(0, 0, 0.2, 1)` which is weaker than the design system token `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`. To inject the strong curve, add a CSS override in `globals.css` that targets the `animate-in` class when applied to these components.

**Target duration**: `150ms` (maps to Tailwind's `duration-150`).  
**Target easing**: override via CSS custom property that `tw-animate-css` respects.

```css
/* To add in src/styles/globals.css under the MOTION SYSTEM section */
/* Override tw-animate-css easing on all floating UI panels to use the strong ease-out token */
[data-open].animate-in,
[data-state=open].animate-in {
  --tw-enter-opacity: 0;
  --tw-enter-scale: 0.97;
  animation-timing-function: var(--ease-out); /* cubic-bezier(0.23, 1, 0.32, 1) */
}
```

```diff
/* dropdown-menu.tsx:44 — change duration-100 → duration-150 */
- "...duration-100 outline-none data-[side=bottom]:slide-in-from-top-2..."
+ "...duration-150 outline-none data-[side=bottom]:slide-in-from-top-2..."

/* dropdown-menu.tsx:138 — change duration-100 → duration-150 */
- "...duration-100 data-[side=bottom]:slide-in-from-top-2..."
+ "...duration-150 data-[side=bottom]:slide-in-from-top-2..."

/* select.tsx:86 — change duration-100 → duration-150 */
- "...duration-100 data-[align-trigger=true]:animate-none..."
+ "...duration-150 data-[align-trigger=true]:animate-none..."

/* popover.tsx:40 — change duration-100 → duration-150 */
- "...duration-100 data-[side=bottom]:slide-in-from-top-2..."
+ "...duration-150 data-[side=bottom]:slide-in-from-top-2..."

/* combobox.tsx:113 — change duration-100 → duration-150 */
- "...duration-100 data-[chips=true]:min-w-(--anchor-width)..."
+ "...duration-150 data-[chips=true]:min-w-(--anchor-width)..."
```

The `tooltip.tsx` already has no explicit duration class, which defaults well — leave it unless a feel-check reveals it's too fast.

## Repo conventions to follow

- Easing tokens in `src/styles/globals.css:171`: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`
- All UI components use `origin-(--transform-origin)` which is correct — do NOT change transform-origin.
- Exemplar: `src/styles/globals.css:373` — `.card-interactive` uses `var(--ease-out)`.

## Steps

1. Open `src/components/ui/dropdown-menu.tsx`, line 44. Change `duration-100` to `duration-150` in the className string (only inside the floating panel className).
2. Same file, line 138: change `duration-100` to `duration-150`.
3. Open `src/components/ui/select.tsx`, line 86: change `duration-100` to `duration-150`.
4. Open `src/components/ui/popover.tsx`, line 40: change `duration-100` to `duration-150`.
5. Open `src/components/ui/combobox.tsx`, line 113: change `duration-100` to `duration-150`.
6. Open `src/styles/globals.css`. After the `/* --- Card Hover Effect ... --- */` block (around line 390), add:
   ```css
   /* --- Floating panel enter easing (dropdowns, selects, popovers) --- */
   [data-open].animate-in,
   [data-state=open].animate-in {
     animation-timing-function: var(--ease-out);
   }
   ```

## Boundaries

- Do NOT change transform-origin — all five components already use `origin-(--transform-origin)` which is correct.
- Do NOT change enter/exit keyframe classes (`zoom-in-95`, `fade-in-0`, `slide-in-from-*`).
- Do NOT modify tooltip behavior or delay.
- Do NOT change any other files.

## Verification

- **Mechanical**: `npx tsc --noEmit` — expect 0 errors.
- **Feel check**: Open any dropdown, select, or popover.
  - In DevTools Animations panel at 10% speed: confirm the enter animation starts fast and decelerates — not a linear pop.
  - Confirm the panel scales from its trigger anchor (not center).
  - Toggle `prefers-reduced-motion` in DevTools Rendering panel — confirm animations are suppressed (handled by the existing global reduced-motion block in globals.css:445).
- **Done when**: dropdowns open with a perceptible but crisp ease-out entry, not an instant pop.
