# P006: TanStack Start Migration & `curl` Server Function

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Vite SPA to TanStack Start (client-only SPA mode) and replace the Vite dev-server HTTP proxy middleware with a type-safe `createServerFn` so `curl` executes server-side without CORS issues.

**Architecture:** We restructure to TanStack Start conventions: file-based routing, auto-generated route tree, SPA mode via the Vite plugin, and a `.functions.ts` / `.server.ts` pair for the HTTP proxy. The terminal remains client-only (no SSR), and only the `curl` command gets backend capability in this phase.

**Tech Stack:** TanStack Start `^1.168.0` (SPA mode) · Existing `@tanstack/react-router` · Zod `^3.23.0` · Vite 6 · Tailwind CSS v4

## Global Constraints

- Terminal stays client-only; no SSR, no loaders, no hydration work.
- Do not implement new commands or backend capabilities beyond `curl`.
- Follow existing `src/` directory convention (not `app/`).
- Preserve all existing terminal behavior: output formatting, error colors, truncation, async prompt handling.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: installed `@tanstack/react-start`, `zod`, `@types/node`.

**Steps:**

- [ ] **Step 1: Add dependencies to `package.json`**
  - `dependencies`: add `"@tanstack/react-start": "^1.168.0"`, `"zod": "^3.23.0"`
  - `devDependencies`: add `"@types/node": "^22.0.0"`
  - Change `build` script from `"tsc && vite build"` to `"vite build"` (route tree generation must run before TS sees `routeTree.gen.ts`)

- [ ] **Step 2: Install**
  ```bash
  npm install
  ```

**Test:** `npm install` completes with zero errors. `node_modules/@tanstack/react-start/package.json` exists.

---

### Task 2: Configure Vite for TanStack Start SPA Mode

**Files:**
- Modify: `vite.config.ts` (complete rewrite)
- Delete: `index.html`

**Interfaces:**
- Produces: Vite config with `tanstackStart({ spa: { enabled: true } })` and no custom middleware.

**Steps:**

- [ ] **Step 1: Rewrite `vite.config.ts`**

  ```ts
  import { defineConfig } from 'vite'
  import { tanstackStart } from '@tanstack/react-start/plugin/vite'
  import viteReact from '@vitejs/plugin-react'
  import tailwindcss from '@tailwindcss/vite'

  export default defineConfig({
    server: { port: 3000 },
    resolve: { tsconfigPaths: true },
    plugins: [
      tailwindcss(),
      tanstackStart({ spa: { enabled: true } }),
      viteReact(),
    ],
  })
  ```

- [ ] **Step 2: Delete `index.html`**
  TanStack Start generates the HTML document shell via `src/routes/__root.tsx`.

**Test:** `npm run dev` starts the Vite dev server on port 3000. It will error on missing `src/routes/__root.tsx` — expected, resolved in Task 3.

---

### Task 3: Migrate to File-Based Routing

**Files:**
- Create: `src/router.tsx`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`
- Delete: `src/main.tsx`
- Delete: `src/routes.tsx`

**Interfaces:**
- `src/router.tsx` exports `getRouter(): Router<typeof routeTree>` — consumed automatically by TanStack Start.
- `src/routes/__root.tsx` exports `Route` — consumed by file-based route generator.
- `src/routes/index.tsx` exports `Route` rendering `<Terminal />`.

**Steps:**

- [ ] **Step 1: Create `src/router.tsx`**

  ```tsx
  import { createRouter } from '@tanstack/react-router'
  import { routeTree } from './routeTree.gen'

  export function getRouter() {
    const router = createRouter({
      routeTree,
      scrollRestoration: true,
    })
    return router
  }

  declare module '@tanstack/react-router' {
    interface Register {
      router: ReturnType<typeof getRouter>
    }
  }
  ```

- [ ] **Step 2: Create `src/routes/__root.tsx`**

  ```tsx
  import type { ReactNode } from 'react'
  import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
  import '../styles/terminal.css'

  export const Route = createRootRoute({
    head: () => ({
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: 'Cyberpunk Terminal Simulator' },
      ],
      links: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=VT323&display=swap' },
      ],
    }),
    component: RootComponent,
  })

  function RootComponent() {
    return (
      <RootDocument>
        <Outlet />
      </RootDocument>
    )
  }

  function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <html lang="en">
        <head>
          <HeadContent />
        </head>
        <body className="bg-black text-terminal-green">
          {children}
          <Scripts />
        </body>
      </html>
    )
  }
  ```

- [ ] **Step 3: Create `src/routes/index.tsx`**

  ```tsx
  import { createFileRoute } from '@tanstack/react-router'
  import { Terminal } from '../components/Terminal'

  export const Route = createFileRoute('/')({
    component: Terminal,
  })
  ```

- [ ] **Step 4: Delete obsolete files**
  - `src/main.tsx`
  - `src/routes.tsx`

**Test:** `npm run dev` generates `src/routeTree.gen.ts` on first run. `http://localhost:3000` renders the terminal with identical styling (VT323 font, black background, glow). Existing sync commands (`help`, `ls`, `clear`, `echo`) work.

---

### Task 4: Create HTTP Proxy Server Function

**Files:**
- Create: `src/lib/proxy.server.ts`
- Create: `src/lib/proxy.functions.ts`

**Interfaces:**
- `proxy.server.ts` exports `executeProxyRequest(url, method, headers?, body?)` — consumed only by `proxy.functions.ts`.
- `proxy.functions.ts` exports `proxyHttpRequest` — consumed by `src/lib/terminalStore.ts`.

**Steps:**

- [ ] **Step 1: Create `src/lib/proxy.server.ts`**

  Extract the Node `http`/`https` proxy logic from the old Vite middleware:

  ```ts
  import http from 'http'
  import https from 'https'
  import { URL } from 'url'

  export async function executeProxyRequest(
    targetUrl: string,
    method: string = 'GET',
    headers: Record<string, string> = {},
    body?: string
  ): Promise<{ status: number; statusText: string; headers: http.IncomingHttpHeaders; body: string }> {
    const parsed = new URL(targetUrl)
    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers,
      timeout: 10000,
    }

    const client = parsed.protocol === 'https:' ? https : http

    return new Promise((resolve, reject) => {
      const proxyReq = client.request(options, (proxyRes) => {
        let responseBody = ''
        proxyRes.on('data', (chunk) => { responseBody += chunk })
        proxyRes.on('end', () => {
          resolve({
            status: proxyRes.statusCode || 0,
            statusText: proxyRes.statusMessage || '',
            headers: proxyRes.headers,
            body: responseBody,
          })
        })
      })

      proxyReq.on('error', (err) => reject(new Error(err.message)))
      proxyReq.on('timeout', () => {
        proxyReq.destroy()
        reject(new Error('Request timeout'))
      })

      if (body) proxyReq.write(body)
      proxyReq.end()
    })
  }
  ```

- [ ] **Step 2: Create `src/lib/proxy.functions.ts`**

  ```ts
  import { createServerFn } from '@tanstack/react-start'
  import { z } from 'zod'
  import { executeProxyRequest } from './proxy.server'

  const proxySchema = z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().default('GET'),
    headers: z.record(z.string()).optional(),
    body: z.string().optional(),
  })

  export const proxyHttpRequest = createServerFn({ method: 'POST' })
    .validator(proxySchema)
    .handler(async ({ data }) => {
      try {
        const result = await executeProxyRequest(data.url, data.method, data.headers, data.body)
        return {
          status: result.status,
          statusText: result.statusText,
          headers: result.headers,
          body: result.body,
        }
      } catch (err) {
        return { error: (err as Error).message }
      }
    })
  ```

**Test:** `npm run dev` compiles without TypeScript errors. (Indirect test in Task 5: `curl` returns real HTTP output.)

---

### Task 5: Wire `curl` to the Server Function

**Files:**
- Modify: `src/lib/terminalStore.ts`

**Interfaces:**
- Consumes: `proxyHttpRequest` from `src/lib/proxy.functions.ts`.
- Produces: identical terminal output behavior as before.

**Steps:**

- [ ] **Step 1: Import the server function**

  Add to `src/lib/terminalStore.ts`:
  ```ts
  import { proxyHttpRequest } from './proxy.functions'
  ```

- [ ] **Step 2: Replace the `fetch` call**

  In the `curl` branch of `executeCommand`, replace:

  ```ts
  fetch('/api/proxy-http', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: result.data.curlUrl,
      method: result.data.curlMethod || 'GET',
    }),
  })
    .then((res) => res.json())
  ```

  with:

  ```ts
  proxyHttpRequest({
    data: {
      url: result.data.curlUrl,
      method: result.data.curlMethod || 'GET',
    },
  })
  ```

  Keep the existing `.then((data) => { ... })` body formatting and `.catch((err) => { ... })` error formatting exactly as-is.

**Test:**
- `curl https://example.com` → returns HTML output in terminal.
- `curl -I https://example.com` → returns headers only.
- `curl https://this-domain-does-not-exist-12345.com` → red error message.

---

### Task 6: Production Build Verification

**Files:** None (verification only)

**Steps:**

- [ ] **Step 1: Build**
  ```bash
  npm run build
  ```

- [ ] **Step 2: Preview and spot-check**
  ```bash
  npm run preview
  ```
  - Terminal renders correctly.
  - `curl` command still works.

**Test:** `npm run build` exits code 0. `dist/` contains built assets.

---

## Self-Review Checklist

| Check | Result |
|-------|--------|
| **Spec coverage** — TanStack Start migration, `createServerFn` for `curl`, SPA mode, no SSR, no extra backend features | ✅ All covered |
| **Placeholder scan** — No "TBD", "implement later", vague steps | ✅ Clean |
| **Type consistency** — `executeProxyRequest` args match `proxySchema`; return type matches store expectations | ✅ Aligned |
| **File paths** — All paths are exact and relative to project root | ✅ Verified |

---

## Verification Steps

1. `npm run dev` starts without errors.
2. `http://localhost:3000` shows the terminal.
3. `curl https://example.com` returns real HTTP response.
4. `curl -I https://example.com` returns headers only.
5. `npm run build` succeeds.
6. `npm run preview` serves the terminal; `curl` still works.

---

## Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add `@tanstack/react-start`, `zod`, `@types/node`; update scripts |
| `vite.config.ts` | Rewrite | TanStack Start plugin, SPA mode, remove custom middleware |
| `index.html` | Delete | Replaced by `src/routes/__root.tsx` document shell |
| `src/router.tsx` | Create | Router factory with file-based route tree |
| `src/routes/__root.tsx` | Create | Root layout with `<html>`, fonts, CSS import |
| `src/routes/index.tsx` | Create | Home route rendering `<Terminal />` |
| `src/main.tsx` | Delete | Obsolete SPA entry point |
| `src/routes.tsx` | Delete | Obsolete code-based route tree |
| `src/lib/proxy.server.ts` | Create | Node `http`/`https` proxy logic (server-only) |
| `src/lib/proxy.functions.ts` | Create | `createServerFn` wrapper with Zod validation |
| `src/lib/terminalStore.ts` | Modify | Replace `fetch('/api/proxy-http')` with `proxyHttpRequest()` |

---

## Build Checklist

- [ ] Task 1: Dependencies installed
- [ ] Task 2: Vite config rewritten, `index.html` removed
- [ ] Task 3: File-based routing set up, obsolete files removed
- [ ] Task 4: Server function and proxy logic created
- [ ] Task 5: `curl` wired to `proxyHttpRequest`
- [ ] Task 6: Production build succeeds
- [ ] TypeScript compiles cleanly
- [ ] `curl` command works in dev and preview

---

*Plan written: 2026-06-27*
