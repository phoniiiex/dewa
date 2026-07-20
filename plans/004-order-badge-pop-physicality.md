# 004 — Fix `orderNumberPop` keyframe — starts from `scale(0.4)`

- **Status**: TODO
- **Commit**: 61f09e2
- **Severity**: MEDIUM
- **Category**: Physicality & Origin
- **Estimated scope**: 1 file (orders/page.tsx), 1 keyframe block

## Problem

The `orderNumberPop` animation used in the Orders page badge starts from `scale(0.4)`:

```css
/* src/app/dashboard/orders/page.tsx:650-654 — current */
@keyframes orderNumberPop {
  0%   { transform: scale(0.4) translateY(-6px); opacity: 0; }
  65%  { transform: scale(1.18) translateY(0);  opacity: 1; }
  82%  { transform: scale(0.94); }
  100% { transform: scale(1);   opacity: 1; }
}
```

`scale(0.4)` means the element appears from almost nothing — too extreme. Per AUDIT.md: "Never `scale(0)` — nothing in the real world appears from nothing. Target: `scale(0.9–0.97)`". `scale(0.4)` is in the same category; it reads as a sudden materialization, not a natural entrance. 

The overshoot at 65% (`scale(1.18)`) is also too aggressive — it's a 18% overshoot and feels "bouncy" in a crisp B2B dashboard context. Max bounce should be ~1.05 to feel spring-like without looking cartoonish.

## Target

```css
/* target */
@keyframes orderNumberPop {
  0%   { transform: scale(0.85) translateY(-4px); opacity: 0; }
  60%  { transform: scale(1.05) translateY(0);   opacity: 1; }
  80%  { transform: scale(0.97); }
  100% { transform: scale(1);    opacity: 1; }
}
```

Key changes:
- Start `scale(0.85)` — within the 0.85–0.97 natural range.
- Start `translateY(-4px)` instead of `-6px` — subtler entrance.
- Overshoot reduced to `scale(1.05)` — a crisp spring, not a cartoon bounce.
- Intermediate compress to `scale(0.97)` — keeps the spring feel without over-oscillating.

## Repo conventions to follow

- The animation uses `cubic-bezier(0.34,1.56,0.64,1)` which is the repo's `--ease-spring` token — keep it.
- Duration `0.55s` is fine for an occasional delight moment (new order badge appears rarely).
- Exemplar: `src/styles/globals.css:306-308` — `@keyframes scaleIn` starts at `scale(0.95)`.

## Steps

1. Open `src/app/dashboard/orders/page.tsx`.
2. Locate the `<style>` block around line 649. Find the `@keyframes orderNumberPop` block (lines 650-654).
3. Replace the keyframe body with:
   ```css
   @keyframes orderNumberPop {
     0%   { transform: scale(0.85) translateY(-4px); opacity: 0; }
     60%  { transform: scale(1.05) translateY(0);   opacity: 1; }
     80%  { transform: scale(0.97); }
     100% { transform: scale(1);    opacity: 1; }
   }
   ```

## Boundaries

- Only change the `@keyframes orderNumberPop` keyframe values — no other code.
- Do NOT change the `.order-badge-pop` animation declaration (line 661-663) — the cubic-bezier and duration are correct.
- Do NOT move this CSS out of the inline `<style>` block.
- Do NOT change `orderNumberGlow`.

## Verification

- **Mechanical**: `npx tsc --noEmit` — expect 0 errors.
- **Feel check**: In the Orders page, create or trigger a new order so the order-number badge appears.
  - In DevTools Animations panel at 10% speed: confirm the badge starts visibly but smaller (not nearly invisible), overshoots slightly, and settles cleanly.
  - Confirm the entrance reads as "spring-like precision", not "cartoon bounce".
- **Done when**: badge entrance starts from a visible scale (not near-zero) and overshoots by a subtle amount only.
