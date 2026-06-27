# Implementation Plan: Virtual Web Page Hosting (`wwwroot` Pages)

**Goal:** Allow users to create basic HTML/CSS pages in the simulated filesystem's `~/wwwroot/` directory and serve them at top-level routes `/:pageName` — rendered as full-viewport pages, not inside the terminal UI.

**Status:** 📝 Planned

---

## Overview

Users can create directories under `/home/user/wwwroot/`, each containing an `index.html` and optionally a `style.css` file. Navigating to `/<pageName>` renders the page as a standalone full-viewport document via a sandboxed iframe, completely separate from the terminal's visual style.

**Architecture Pattern:** Dynamic TanStack Router route + Zustand store access + iframe sandbox security.

---

## Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Store pages in simulated filesystem** at `/home/user/wwwroot/<pageName>/` | Pages created via terminal commands (`mkdir`, `edit`); no real fs dependency |
| 2 | **Conventional file naming** (`index.html`, `style.css`) | Familiar web convention; `html`/`css` bare names would be confusing |
| 3 | **Sandbox iframe for security** (empty `sandbox` attribute) | Browser-enforced script blocking; no parsing/validation needed |
| 4 | **Full viewport takeover** — no terminal chrome visible | User said "output does not follow terminal UI style" |
| 5 | **Top-level `/:pageName` routes** | Clean URLs; TanStack Router prioritizes static routes over dynamic params |
| 6 | **CSS inlined into `<style>` tag inside `srcdoc`** | Single iframe, no `allow-same-origin` needed, works perfectly with sandbox |
| 7 | **Pre-create `wwwroot/` directory and `example/` page** | Users see a working example on first visit; discoverability |

---

## Micro-Decisions

| # | Decision | Rationale |
|---|---|---|
| A | Path traversal blocked: reject `..`, `/`, `\0` in `pageName` | Prevent reading files outside `wwwroot/` |
| B | Directory missing → 404; `index.html` missing → 404 | Both are "page not found" conditions |
| C | `style.css` missing → render without custom styles | Not an error; page still works |
| D | Other files in directory (e.g. `readme.txt`) ignored | Only `index.html` and `style.css` are read |
| E | Small `⧉ Terminal` link in corner to navigate back to `/` | Users need a way to return to the terminal |
| F | Route param name: `pageName` (camelCase) | Consistent with TanStack Router conventions |

---

## Files to Create

### 1. `src/routes/$pageName.tsx` — Dynamic route component

**Route pattern:** `/:pageName` (TanStack Router file-based routing)

**Component logic:**
1. Extract `pageName` from `Route.useParams()`
2. Validate: reject if contains `..`, `/`, or `\0` — return 404
3. Access Zustand store via `useTerminalStore()`
4. Get filesystem from `store.fileSystem`
5. Check directory `/home/user/wwwroot/${pageName}/` exists → if not, 404
6. Read `index.html` from that directory → if not found, 404
7. Read `style.css` (optional — if missing, no custom styles)
8. Build HTML document:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <style>/* CSS content */</style>
   </head>
   <body>
     <!-- HTML content -->
   </body>
   </html>
   ```
9. Render via `<iframe srcdoc={...} sandbox="" />` filling the viewport
10. Add fixed-position "⧉ Terminal" link (top-left corner, subtle styling)
11. 404 state: renders a plain "Page not found" message (no terminal chrome)

**Style for the route page (parent, not iframe):**
```css
/* Full viewport, dark background for the "chrome" around the iframe */
html, body, #root { height: 100%; margin: 0; }
iframe { border: none; width: 100%; height: 100%; }
```

**Style for the 404 page:**
```css
/* Centered, minimal, dark background */
body { background: #111; color: #ccc; font-family: system-ui; display: flex;
       align-items: center; justify-content: center; height: 100vh; }
```

---

## Files to Modify

### 2. `src/lib/fileSystem.ts` — Add `wwwroot/` and example page to defaults

**In `initializeDefaults()`**, add:

```ts
// wwwroot directory for hosted pages
const wwwrootDirs = [
  '/home/user/wwwroot',
  '/home/user/wwwroot/example',
]
for (const dir of wwwrootDirs) {
  if (!this.entries.has(dir)) this.entries.set(dir, { type: 'directory' })
}

this.createFile('/home/user/wwwroot/example/index.html',
`<h1>Hello, World!</h1>
<p>Welcome to my first page on the virtual terminal.</p>
<p>This page is served from <code>~/wwwroot/example/</code>.</p>
`)

this.createFile('/home/user/wwwroot/example/style.css',
`body {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 640px;
  margin: 4rem auto;
  padding: 0 1rem;
  background: #faf9f6;
  color: #1a1a1a;
  line-height: 1.6;
}
h1 { color: #2563eb; }
code { background: #e8e8e8; padding: 0.15rem 0.4rem; border-radius: 4px; }
`)
```

---

## Route Registration

No manual registration needed — TanStack Start's file-based routing auto-discovers `$pageName.tsx` and registers it as `/:pageName`. The static `/` route (terminal) takes priority over the dynamic param.

---

## Security

| Threat | Mitigation |
|---|---|
| **Path traversal** (`/../../etc`) | Reject `..`, `/`, `\0` in `pageName` param |
| **JavaScript execution** | Empty `sandbox` attribute on iframe — blocks scripts, forms, popups, navigation, pointer lock, etc. |
| **External resource loading** | `srcdoc` content is self-contained; no network requests from iframe |
| **CSS injection / exfiltration** | CSS can style but cannot execute code; acceptable risk |

---

## Edge Cases

| Case | Behavior |
|---|---|
| `pageName` is empty string | 404 |
| `pageName` is `.` or `..` | 404 (caught by traversal check) |
| `pageName` contains `/` or `\0` | 404 (caught by traversal check) |
| Directory exists but `index.html` missing | 404 |
| Directory exists, `index.html` present, no `style.css` | Render without custom styles |
| Hard navigate (full page reload) | SPA mode loads store from `localStorage`; filesystem data restored client-side |
| User deletes `wwwroot/` directory via `rm -rf` | All pages return 404; next `reset` restores defaults |
| Page name matches a future static route (e.g. `settings`) | TanStack Router prioritizes static routes; static route wins |
| Very large HTML/CSS files | `srcdoc` attribute has no practical size limit in modern browsers |

---

## Testing Checklist

1. `mkdir ~/wwwroot/test` + `edit ~/wwwroot/test/index.html` + `edit ~/wwwroot/test/style.css` → visit `/test` → page renders with styles
2. Visit `/example` (pre-created) → "Hello, World!" page renders with blue heading
3. Visit `/nonexistent` → 404 page shown
4. Visit `/../` → 404 (path traversal blocked)
5. Create `index.html` without `style.css` → page renders, no custom styles
6. `index.html` contains `<script>alert(1)</script>` → sandbox blocks it, no alert fires
7. `index.html` contains `<img src=x onerror=alert(1)>` → sandbox blocks event handlers
8. Visit `/` → terminal still works normally
9. Click "⧉ Terminal" link → navigates back to terminal at `/`

---

## Status

**Status:** 📝 Planned

---

## Related Documents

- [P001-implementation.md](P001-implementation.md) — Original terminal implementation
- [P005-filesystem-localstorage-persistence.md](P005-filesystem-localstorage-persistence.md) — Filesystem persistence to localStorage
