# 006 — Consolidate duplicate `@keyframes spin` definitions

- **Status**: TODO
- **Commit**: 61f09e2
- **Severity**: LOW
- **Category**: Cohesion & Tokens
- **Estimated scope**: 2 files + several inline <style> tags

## Problem

`@keyframes spin` is defined in three places and the identical keyframe body is also inlined in multiple component `<style>` tags:

```
src/styles/globals.css:315        — global @keyframes spin
src/styles/dashboard.css:722      — duplicate @keyframes spin
src/app/dashboard/orders/page.tsx:1248  — inline @keyframes spin
src/app/client/[id]/page.tsx:94   — inline @keyframes spin
```

Duplicate `@keyframes` with the same name are harmless at runtime (last-declared wins) but represent authorship confusion and maintenance burden. The inline definitions are at risk of diverging from the global one.

Current duplicate (dashboard.css:722):
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

Inline (orders/page.tsx:1248):
```css
@keyframes spin { to { transform: rotate(360deg); } }
```

Inline (client/[id]/page.tsx:94):
```css
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
```

## Target

One canonical definition in `globals.css`. Remove the duplicate from `dashboard.css`. Remove the inline definitions from both page files (they can rely on the global one).

The canonical (already correct) definition in `globals.css:315`:
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

## Repo conventions to follow

- Global keyframes live in `src/styles/globals.css` under `/* --- Keyframes --- */` (line 279).
- `dashboard.css` should not define any keyframes — it is a layout/component stylesheet.

## Steps

1. Open `src/styles/dashboard.css`. Delete lines 721-725 (the full `@keyframes spin { ... }` block including the comment line `/* === Spin Animation === */`).
2. Open `src/app/dashboard/orders/page.tsx`. Find the inline `<style>` block around line 1248. Delete only the line `@keyframes spin { to { transform: rotate(360deg); } }` (line 1248) — do not touch the `@keyframes progress-pulse` block below it.
3. Open `src/app/client/[id]/page.tsx`. Find the inline `<style>` tag around line 94. Delete it entirely if `@keyframes spin` is its only content, or delete just the spin keyframe if there are other rules inside.

## Boundaries

- Do NOT delete the `@keyframes spin` in `src/styles/globals.css` — that is the canonical definition.
- Do NOT change anything else in the page files other than the `<style>` tag containing spin.
- Do NOT modify the spinner elements themselves — only remove the redundant keyframe declarations.

## Verification

- **Mechanical**: `npx next build` — expect 0 errors. Spin animations still work (they now use the global definition).
- **Feel check**: Navigate to the Orders page and trigger any loading spinner — confirm it still rotates smoothly.
- **Done when**: Only one `@keyframes spin` exists in the codebase (`globals.css`). Verify with: `grep -r "@keyframes spin" src/` — should return exactly one result.
