# Implementation Plan: API Routes for External Consumers

**Goal:** Expose a public HTTP API (REST/JSON) that external tools can use to interact with the terminal simulator — query filesystem state, execute commands, and retrieve output.

**Status:** 📝 Planned

---

## Overview

TanStack Start supports API routes alongside server functions. These routes live in `src/routes/api/` and export `GET`, `POST`, `PUT`, `DELETE` handler functions that return JSON. The initial scope covers a read-only filesystem inspection endpoint and a command execution endpoint.

**Architecture Pattern:** TanStack Start API routes (`src/routes/api/*.ts`) with JSON responses.

---

## Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **TanStack Start API routes**, not a separate server | Same process, no additional infrastructure |
| 2 | **JSON responses only** — no HTML, no XML | Simple, widely compatible |
| 3 | **Authentication: Clerk session required** for write endpoints | Read-only endpoints may be public or require auth — decide later |
| 4 | **Rate limiting: not in initial scope** | Can add later if needed |
| 5 | **CORS: allow all origins** in dev; restrict in production | Dev convenience; production should configure specific origins |

---

## Micro-Decisions

| # | Decision | Rationale |
|---|---|---|
| A | `GET /api/fs` — list filesystem tree as JSON | Useful for external tools to inspect state |
| B | `GET /api/fs/{path}` — read file content at path | Return `{ path, content, type }` |
| C | `POST /api/command` — execute a terminal command | Body: `{ command: string }` → Response: `{ success, output, error }` |
| D | `GET /api/status` — health check / info endpoint | Returns `{ version, uptime, commands }` |
| E | API versioning: prefix with `/api/v1/` | Future-proofing for breaking changes |
| F | Error responses use consistent format: `{ error: string, code: number }` | Easy for clients to parse |

---

## Files to Create

### 1. `src/routes/api/v1/status.ts` — Health check

```ts
import { createAPIFileRoute } from '@tanstack/react-start/api'

export const GET = createAPIFileRoute('/api/v1/status')({
  handler: () => {
    return Response.json({
      status: 'ok',
      version: '1.0.0',
      uptime: process.uptime(),
      commands: 23, // or pull from command registry
    })
  },
})
```

### 2. `src/routes/api/v1/fs.ts` — Filesystem tree listing

**Handler**:
1. Import the `FileSystem` instance (or a server-side snapshot)
2. Return `{ entries: [{ path, type, size, modified }] }` sorted alphabetically

Note: The filesystem is currently client-side only (Zustand + Map). For API routes, the server needs its own filesystem state. Options:
- Use localStorage-backed state → not accessible server-side
- Use a server-side in-memory filesystem (separate from client FS) → inconsistent state
- Use a shared DB (SQLite via `better-sqlite3`) → most robust but adds dependency

**Recommendation**: Start with a **server-side filesystem snapshot endpoint** that returns a static or pre-populated tree. In the future, if a DB is added for persistence, the API can read/write to it.

### 3. `src/routes/api/v1/fs/[path].ts` — File read endpoint

**Handler**:
1. URL-decoded path parameter
2. Look up file in server-side filesystem
3. Return `{ path, content, type: 'file'|'directory' }` or 404

### 4. `src/routes/api/v1/command.ts` — Command execution endpoint

```ts
export const POST = createAPIFileRoute('/api/v1/command')({
  handler: async (ctx) => {
    const { command } = await ctx.request.json()
    // Execute command against a server-side terminal session
    // Return { success, output, error }
  },
})
```

**Challenges**:
- Commands currently run client-side with access to DOM, Zustand, and the filesystem Map
- For the API, either:
  - **Option A**: Duplicate the command logic server-side (partial compatibility)
  - **Option B**: The API spawns a headless terminal session on the server (complex)
- **Decision**: Option A — implement a subset of commands server-side (filesystem commands: `ls`, `cat`, `pwd`, `echo`, `help`). Full command parity is out of scope for initial implementation.

---

## Files to Modify

### 5. `vite.config.ts` — No changes needed

TanStack Start API routes are auto-discovered.

### 6. `src/router.tsx` — Ensure API routes are included

TanStack Start's file-based routing should auto-detect `src/routes/api/`. Verify no exclusion patterns.

---

## Testing Checklist

1. `curl http://localhost:3000/api/v1/status` → JSON with `status: "ok"`
2. `curl http://localhost:3000/api/v1/fs` → JSON filesystem listing
3. `curl http://localhost:3000/api/v1/fs/README.md` → JSON with file content
4. `curl -X POST -H "Content-Type: application/json" -d '{"command":"ls"}' http://localhost:3000/api/v1/command` → JSON output
5. `curl http://localhost:3000/api/v1/fs/nonexistent` → 404 JSON error
6. All endpoints return `Content-Type: application/json` header

---

## Status

**Status:** 📝 Planned — not yet implemented.

---

## Related Documents

- [F007-additional-server-functions.md](F007-additional-server-functions.md) — Server functions (`date`, `hostname`) are a lighter-weight pattern than API routes
- [P006-tanstack-start-migration.md](../P006-tanstack-start-migration.md) — Established the TanStack Start server infrastructure that API routes build on
