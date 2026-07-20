# 005 — Fix reduced-motion: preserve opacity/color feedback, drop movement

- **Status**: TODO
- **Commit**: 61f09e2
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file (globals.css), 1 media query block

## Problem

The current `prefers-reduced-motion: reduce` block nukes ALL transitions and animations to 0.01ms:

```css
/* src/styles/globals.css:445-467 — current */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .card-interactive,
  .card-interactive:hover,
  .card-interactive:active {
    transform: none;
    box-shadow: none;
    transition: none;
  }
  /* ... */
}
```

Per AUDIT.md: "Reduced motion means fewer and gentler animations, **not zero** — keep transitions that aid comprehension, remove position changes." Eliminating ALL transitions removes color/opacity feedback that users rely on for state comprehension (button focus rings, input focus glow, hover color changes). This is an accessibility regression.

## Target

Instead of nuking all durations, selectively zero out transform/scale/translate/blur animations (position movement) while keeping color, opacity, and box-shadow transitions at a gentle 150ms:

```css
/* target */
@media (prefers-reduced-motion: reduce) {
  /* Kill movement (position, scale, blur) — keep color/opacity/shadow feedback */
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    /* Do NOT set transition-duration to 0.01ms — preserve color/opacity transitions */
  }

  /* Suppress transform-based transitions specifically */
  *,
  *::before,
  *::after {
    transition-property: color, background-color, border-color, box-shadow, opacity !important;
    transition-duration: 150ms !important;
    transition-timing-function: ease !important;
  }

  /* Remove motion from stagger animations — just show all items immediately */
  .page-stagger > *,
  .table-stagger > tr,
  [data-slot="table-body"] > tr {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  /* Remove card lift effect */
  .card-interactive,
  .card-interactive:hover,
  .card-interactive:active {
    transform: none !important;
    box-shadow: none !important;
    transition-property: background-color, border-color !important;
    transition-duration: 150ms !important;
  }
}
```

## Repo conventions to follow

- The existing reduced-motion block is at `src/styles/globals.css:445-468`.
- Replace it entirely with the target block — the structure is a direct extension of what's already there.

## Steps

1. Open `src/styles/globals.css`.
2. Locate the `@media (prefers-reduced-motion: reduce)` block at lines 445-468.
3. Replace the entire block with:

```css
/* =========================================================
   REDUCED MOTION
   Reduced motion = fewer and gentler animations, not zero.
   Keep color/opacity/shadow feedback; drop position movement.
   ========================================================= */
@media (prefers-reduced-motion: reduce) {
  /* Kill keyframe animations */
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }

  /* Restrict transitions to color/opacity/shadow only — drop transform/filter/width */
  *,
  *::before,
  *::after {
    transition-property: color, background-color, border-color, box-shadow, opacity !important;
    transition-duration: 150ms !important;
    transition-timing-function: ease !important;
  }

  /* Show stagger children immediately without movement */
  .page-stagger > *,
  .table-stagger > tr,
  [data-slot="table-body"] > tr {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  /* Remove card hover lift */
  .card-interactive,
  .card-interactive:hover,
  .card-interactive:active {
    transform: none !important;
    box-shadow: none !important;
  }
}
```

## Boundaries

- Only modify the `@media (prefers-reduced-motion: reduce)` block in `src/styles/globals.css`.
- Do NOT add new dependencies.
- Do NOT remove the block — reduced-motion support must be preserved.

## Verification

- **Mechanical**: `npx tsc --noEmit` — expect 0 errors.
- **Feel check**: In DevTools Rendering panel, enable "Emulate CSS media feature prefers-reduced-motion: reduce".
  - Hover a sidebar item — color change should still animate (150ms ease).
  - Focus an input — box-shadow focus ring should still appear (150ms ease).
  - Navigate to a page with `page-stagger` — all items should appear immediately without sliding in.
  - Click a button — no scale animation, but background-color change is still visible.
- **Done when**: reduced-motion mode preserves color/focus/hover state feedback while eliminating all position/scale/blur movement.
