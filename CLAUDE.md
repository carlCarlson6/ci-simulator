# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser-based cyberpunk terminal simulator. A React + TanStack Start app that emulates a Unix shell against an in-memory file system, with optional Clerk auth and Postgres-backed state sync.

## Commands

```bash
npm run dev          # Vite dev server on :3000
npm run build        # Production build (Vercel target via nitro)
npm start            # Run built server from .output/server/index.mjs
npm run gen          # Regenerate src/routeTree.gen.ts (TanStack Router CLI)

npm run db:generate  # Generate a new Drizzle migration from schema.ts
npm run db:migrate   # Apply pending migrations
npm run db:push      # Push schema directly (dev shortcut)
npm run db:studio    # Open Drizzle Studio
```

No test runner, linter, or formatter is configured. `tsc --noEmit` (no script) is the only static check; `tsconfig.json` is `strict: true`.

Local Postgres for auth-backed features: `docker compose up -d` after filling `.env` from `.env.example`. Without `VITE_CLERK_PUBLISHABLE_KEY` set, the app still runs but `login`/`logout`/`whoami`/`publish` degrade gracefully.

## Architecture

This is a TanStack Start app (SPA-style) with three layers that all funnel through a Zustand store:

### 1. Command pipeline ([src/lib/commands/](src/lib/commands/))

Every shell command is a `CommandHandler: (args, context) => CommandResult` — a **pure function** that reads the file system / env / paths off `context` and returns a `CommandResult` describing what should change. Handlers never touch the store, DOM, or network directly.

When a command needs a side effect (changing cwd, clearing the screen, opening the editor modal, running an HTTP request, persisting publish state), it returns hints inside `CommandResult.data`, and a sibling `CommandEffect` consumes them via `CommandEffectContext`. Both are registered in [src/lib/commands/index.ts](src/lib/commands/index.ts) in the `commands` and `commandEffects` maps. **Adding a new command = create a file under `src/lib/commands/`, export `handler` (and optionally `effect`), then wire it into both maps.**

`executeCommand` in [index.ts](src/lib/commands/index.ts) does `$VAR` expansion on the args string before splitting. Tab completion lives in `getCompletionCandidates` in the same file.

### 2. State store ([src/lib/terminalStore.ts](src/lib/terminalStore.ts))

A single Zustand store owns the `FileSystem` instance, current/previous path, history, theme, env vars, lines buffer, editor/markdown modal state, and auth bridge. The store's `executeCommand` is the orchestrator — it calls the pure `executeCommand` from the commands module, then runs the matching `CommandEffect`, then appends output/error lines, then calls `persistState` + `syncToServerIfUser`.

After every mutation, state is persisted to `localStorage` and (if signed in) mirrored to the server via [src/lib/sync.ts](src/lib/sync.ts) → [src/lib/serverStorage.ts](src/lib/serverStorage.ts) → `saveServerState` server function.

### 3. File system ([src/lib/fileSystem.ts](src/lib/fileSystem.ts))

Flat `Map<string, { type, content? }>` keyed by absolute paths. Paths normalize via `resolvePath` (handles `~`, `..`, `.`). Directory listings are synthesized by scanning all keys with the directory as prefix. Serialization is just `Array.from(entries)` — same shape stored in `localStorage` and in the `userState.data.fileSystem` JSONB column.

### 4. Server functions ([src/lib/server-fns.ts](src/lib/server-fns.ts))

All server-side work goes through `createServerFn` from `@tanstack/react-start`. There are no Nitro API routes wired up — `src/routes/api/` is empty by design. Auth is read from the Clerk `__session` cookie via `verifyToken` inside `getUserId()`. Each call opens and closes its own `postgres` client through the `withDb` helper.

Server functions defined:
- `getUser`, `loadServerState`, `saveServerState` — auth + state sync
- `executeCurl` — proxied HTTP for the `curl` command (real network, runs server-side via [curlServer.ts](src/lib/curlServer.ts))
- `listMyPages`, `publishPage`, `getPublishedPage` — wwwroot publishing

### 5. Routes

File-based via TanStack Router. `routeTree.gen.ts` is generated — never edit it by hand; run `npm run gen` or let the Vite plugin regenerate. Routes:
- [__root.tsx](src/routes/__root.tsx) — document shell + conditional `ClerkProvider` (only mounted if a real Clerk key is set)
- [index.tsx](src/routes/index.tsx) — renders `<Terminal />`
- [desktop.tsx](src/routes/desktop.tsx) — desktop GUI (`?app=<id>` opens that app); renders `<Desktop />`
- [$pageName.tsx](src/routes/$pageName.tsx) — dynamic route serving published wwwroot pages via `getPublishedPage` in a sandboxed iframe

### 6. Desktop GUI ([src/components/desktop/](src/components/desktop/))

`/desktop` is a windowed shell over the *same* terminal session: [desktopStore.ts](src/lib/desktopStore.ts) owns only window-manager state (open windows, geometry, z-order, single instance per app); all file system / tasks / theme / auth state stays in `terminalStore`. Apps under `components/desktop/apps/` (Terminal embed, Files, Notes, Tasks, Settings) are mouse-driven views over the shared store, reusing its mutation helpers so persistence + server sync stay in one place. `bootTerminalSession` ([terminalBoot.ts](src/lib/terminalBoot.ts)) guards one-time store hydration for both `/` and `/desktop`. The store's `executeCommand` bumps `fsVersion` after every command so GUI views re-render on shell-made FS changes. The `desktop` command navigates from the terminal to the GUI.

### Path alias

`~/*` maps to `src/*` — defined in both `tsconfig.json` and `vite.config.ts`.

## Database

Drizzle ORM over `postgres-js`. Schema in [src/lib/db/schema.ts](src/lib/db/schema.ts):
- `virtual_terminal_user_state` — per-user JSONB blob (file system + cwd + theme + envVars) keyed by Clerk user id
- `static_pages` — claim table for published wwwroot page names

`ServerStatePayload` is the canonical wire/storage shape (versioned via `v: 1`); `isValidPayload` in server-fns gates writes.

## Plans

[plans/](plans/) holds versioned design docs (P001…P014). They are reference material — most features described there are already shipped. Treat them as historical context, not active TODOs.
