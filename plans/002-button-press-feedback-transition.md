# 002 — Fix button press feedback — missing transition

- **Status**: TODO
- **Commit**: 61f09e2
- **Severity**: HIGH
- **Category**: Physicality & Easing
- **Estimated scope**: 1 file (globals.css), 1 rule-set

## Problem

The global button `:active` rule applies `transform: scale(0.97)` but has no `transition` declaration on the button itself. This means the scale-down fires instantly (no ease-in feedback) but the scale-back fires as a jump too — asymmetric press/release breaks the physical feel.

```css
/* src/styles/globals.css:359-362 — current */
button:not([disabled]):active,
[role="button"]:not([disabled]):active {
  transform: scale(0.97);
}
```

There is no matching `transition` on `button` — shadcn's Button component adds its own transitions but bare `<button>` elements and `[role="button"]` elements get none.

## Target

Add a matching idle-state transition so both the press (fast) and release (fast ease-out) are smooth:

```css
/* target — add BEFORE the :active rule */
button:not([disabled]),
[role="button"]:not([disabled]) {
  transition: transform 160ms var(--ease-out);
}

button:not([disabled]):active,
[role="button"]:not([disabled]):active {
  transform: scale(0.97);
  transition-duration: 80ms; /* snap in fast, ease out on release */
}
```

The exact values per AUDIT.md: `transform: scale(0.97)` on `:active`, `transition: transform 160ms ease-out` at rest. The fast snap-in (80ms) + slower ease-back (160ms) is the asymmetric pattern that reads as physical.

## Repo conventions to follow

- Easing token: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);` from `src/styles/globals.css:171`.
- Duration tokens: `--duration-fast: 100ms`, 80ms (for the press snap-in) is close enough — use an inline `80ms` since there is no `--duration-snap` token, or add one to `:root`.
- Exemplar: `src/styles/globals.css:385-388` — `.card-interactive:active` uses `transition-duration: var(--duration-fast)` to shorten on press.

## Steps

1. Open `src/styles/globals.css`.
2. Locate lines 358-368 (the button press section).
3. Before `button:not([disabled]):active`, insert:
   ```css
   button:not([disabled]),
   [role="button"]:not([disabled]) {
     transition: transform 160ms var(--ease-out);
   }
   ```
4. On the `:active` rule (currently lines 359-362), add `transition-duration: 80ms;`:
   ```css
   button:not([disabled]):active,
   [role="button"]:not([disabled]):active {
     transform: scale(0.97);
     transition-duration: 80ms;
   }
   ```

The final block should read:

```css
/* --- Button Press Feedback --- */
button:not([disabled]),
[role="button"]:not([disabled]) {
  transition: transform 160ms var(--ease-out);
}

button:not([disabled]):active,
[role="button"]:not([disabled]):active {
  transform: scale(0.97);
  transition-duration: 80ms;
}

/* Exclude nav items from press feedback */
[data-no-press]:active,
nav button:active {
  transform: none;
}
```

## Boundaries

- Touch ONLY `src/styles/globals.css`, lines 358-368.
- Do NOT change markup, shadcn Button component, or any other files.
- Do NOT add new npm dependencies.
- If the line numbers have drifted, locate the "Button Press Feedback" comment block and apply the edit there.

## Verification

- **Mechanical**: `npx tsc --noEmit` — expect 0 errors.
- **Feel check**: Click any plain `<button>` or filter pill — confirm:
  - Press feels like a quick, snappy physical depression (80ms snap-in).
  - Release eases out smoothly back to full size over ~160ms.
  - In DevTools Animations panel at 10% speed: confirm transform animates both directions.
  - Nav buttons (sidebar items) still have no scale feedback (they have `data-no-press` or are inside `<nav>`).
- **Done when**: pressing any interactive element shows a visible, smooth scale-down-and-up cycle.
