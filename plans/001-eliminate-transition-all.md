# 001 — Replace `transition: all` with explicit property transitions

- **Status**: TODO
- **Commit**: 61f09e2
- **Severity**: HIGH
- **Category**: Performance & Easing
- **Estimated scope**: 2 files, ~9 rule-sets

## Problem

`transition: all` triggers style recalculation and paints for every animatable property — including layout properties and GPU-incompatible ones — every time any CSS value changes. This causes dropped frames and can animate completely unintended properties.

Nine rule-sets across `dashboard.css` and `login.css` use it:

```css
/* src/styles/dashboard.css:74 */
.sidebar-collapse-btn { transition: all var(--transition-fast); }

/* src/styles/dashboard.css:110 */
.sidebar-item { transition: all var(--transition-fast); }

/* src/styles/dashboard.css:238 */
.sidebar-user-more { transition: all var(--transition-fast); }

/* src/styles/dashboard.css:310 */
.topbar-btn { transition: all var(--transition-fast); }

/* src/styles/dashboard.css:327 */
.topbar-date-btn { transition: all var(--transition-fast); }

/* src/styles/login.css:58 */
.login-register-link a { transition: all var(--transition-fast); }

/* src/styles/login.css:147 */
.input-wrapper input { transition: all var(--transition-fast); }

/* src/styles/login.css:217 */
.login-btn { transition: all var(--transition-fast); }

/* src/styles/login.css:330 */
.branding-dots .dot { transition: all var(--transition-base); }
```

## Target

Replace every `transition: all` with only the properties that actually change on hover/focus/active. Easing and duration tokens stay the same.

```css
/* dashboard.css:74 */
.sidebar-collapse-btn {
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

/* dashboard.css:110 */
.sidebar-item {
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

/* dashboard.css:238 */
.sidebar-user-more {
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

/* dashboard.css:310 */
.topbar-btn {
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

/* dashboard.css:327 */
.topbar-date-btn {
  transition:
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}

/* login.css:58 */
.login-register-link a {
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

/* login.css:147 */
.input-wrapper input {
  transition:
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

/* login.css:217 */
.login-btn {
  transition:
    background-color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

/* login.css:330 */
.branding-dots .dot {
  transition:
    width var(--duration-base) var(--ease-out),
    background-color var(--duration-base) var(--ease-out);
}
```

## Repo conventions to follow

- Easing tokens in `src/styles/globals.css` `:root` (lines 171-174):
  - `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`
- Duration tokens: `--duration-fast: 100ms`, `--duration-base: 180ms`
- Exemplar: `src/styles/globals.css:373-376` — `.card-interactive` uses named property lists.

## Steps

1. Open `src/styles/dashboard.css`.
2. Line 74 in `.sidebar-collapse-btn`: replace `transition: all var(--transition-fast);` with the two-property version above.
3. Line 110 in `.sidebar-item`: same replacement.
4. Line 238 in `.sidebar-user-more`: same replacement.
5. Line 310 in `.topbar-btn`: same replacement.
6. Line 327 in `.topbar-date-btn`: replace with border-color + color version.
7. Open `src/styles/login.css`.
8. Line 58 in `.login-register-link a`: replace with three-property version.
9. Line 147 in `.input-wrapper input`: replace with border-color + box-shadow + background-color version.
10. Line 217 in `.login-btn`: replace with background-color + transform + box-shadow version.
11. Line 330 in `.branding-dots .dot`: replace with width + background-color version.

## Boundaries

- Do NOT touch any other files.
- Do NOT change markup or structure — motion properties only.
- Do NOT add new dependencies.
- If a line number doesn't match the code you find, STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx next build` — expect 0 errors.
- **Feel check**: In DevTools Performance panel, hover sidebar items rapidly — confirm no `Layout` or `Paint` records appear. In Animations panel at 10% speed, confirm only named properties animate.
- **Done when**: no `transition: all` appears in `dashboard.css` or `login.css`.
