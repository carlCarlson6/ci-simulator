# Implementation Plan: Server Storage Sync

Sync terminal state (filesystem, path, theme, env vars) to Redis when the user is authenticated. On sign-in, restore state from Redis, overwriting local storage.

**Status:** PLANNED
**Dependencies:** P007 Clerk Authentication

---

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Browser)                          Server (Node.js) │
│                                                             │
│  ┌──────────────┐    syncStateToServer()    ┌────────────┐  │
│  │              │ ─────────────────────────> │            │  │
│  │ localStorage │                            │   Redis    │  │
│  │              │ <───────────────────────── │            │  │
│  └──────────────┘    loadStateFromServer()    └────────────┘  │
│        │                                                    │
│        ▼                                                    │
│  ┌──────────────┐                                           │
│  │ Zustand Store│  restoreServerState() updates store       │
│  └──────────────┘  + overwrites localStorage                │
│                                                             │
│  Auth: Clerk session cookie sent with server fn request     │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Dependencies & Environment

**Install:**
- `ioredis` — Redis client for Node.js (works with standard `redis://` protocol, compatible with both local Docker Redis and managed providers like Upstash)

**Files to modify:**
- `package.json` — add `ioredis` and `@types/ioredis`
- `.env.local` — add `REDIS_URL`
- `docker-compose.yml` — **create** for local Redis

## Phase 2: Server-Side Auth Verification

**Goal:** Verify Clerk session inside server functions to get the user ID.

**How it works:**
1. Clerk sets a `__session` cookie on the client after sign-in.
2. TanStack Start server functions receive the Fetch API `Request` object.
3. Parse the `__session` cookie from `request.headers`.
4. Verify the session token using Clerk's secret key (`CLERK_SECRET_KEY` from env, already in `.env.local`).
5. Extract `userId` from the verified session.

**Implementation:** Use `jose` (already compatible with Node.js) to verify the Clerk session JWT. Clerk sessions are JWTs signed with the Clerk secret key. We can verify them using the `@clerk/backend` package or manually with `jose`.

We'll use `@clerk/backend` for proper session verification. It provides `createClerkClient({ secretKey }).verifyToken(sessionToken)`.

**Files to create:**
- `src/lib/serverStorage.ts` — server functions + client wrappers

## Phase 3: Server Functions in `src/lib/serverStorage.ts`

### `saveServerState` (POST)

```
Input:  { fileSystem, currentPath, theme, envVars }
Auth:   Clerk session cookie → userId
Action: Redis SET ci-simulator:state:{userId} → JSON
Output: { ok: true }
```

### `loadServerState` (GET)

```
Input:  (none)
Auth:   Clerk session cookie → userId
Action: Redis GET ci-simulator:state:{userId}
Output: { fileSystem, currentPath, theme, envVars } | null
```

### Redis connection

```typescript
import { Redis } from 'ioredis'

function getRedis(): Redis {
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
}
```

### Data shape (Redis value)

```typescript
type ServerStatePayload = {
  v: 1
  fileSystem: [string, { type: 'file' | 'directory', content?: string }][]
  currentPath: string
  theme: string
  envVars: Record<string, string>
}
```

### Client-side wrappers

- `syncStateToServer()` — reads `useTerminalStore.getState().user`; if authenticated, reads all 4 localStorage keys and calls `saveServerState` (fire-and-forget, no await)
- `loadStateFromServer()` — calls `loadServerState`, returns the payload or null

## Phase 4: Store Integration (`terminalStore.ts`)

### New action: `restoreServerState(data: ServerStatePayload)`

1. Call `createFileSystemFromSerialized(data.fileSystem)` to rebuild the `FileSystem` instance
2. Overwrite all 4 localStorage keys with the server data
3. `set()` filesystem, currentPath, previousPath, currentTheme, envVars
4. Add a `{ type: 'system', content: 'State restored from server.' }` line

### Sync triggers

Every localStorage write site gets a fire-and-forget `syncStateToServer()` call:

| # | Write point | Location |
|---|-------------|----------|
| 1 | `saveFileSystem(fs)` — empty command | `executeCommand` line 125 |
| 2 | `saveFileSystem(fs)` — effect handled | `executeCommand` line 171 |
| 3 | `saveFileSystem(fs)` — default path | `executeCommand` line 188 |
| 4 | `localStorage.setItem('currentPath')` | `setPaths` callback line 158 |
| 5 | `localStorage.setItem('theme')` | `setTheme` line 228 |
| 6 | `localStorage.setItem('envVars')` | `setEnvVar` line 266 |
| 7 | `saveFileSystem(fs)` — saveEditor | `saveEditor` line 252 |

All sync calls are guarded by checking `get().user !== null`.

## Phase 5: Auth Integration (`auth.tsx`)

Extend the `isSignedIn` useEffect in `useAuthSync()`:

```typescript
useEffect(() => {
  if (isSignedIn && user) {
    const username = user.username || user.firstName || user.emailAddresses[0]?.emailAddress || 'user'
    setUser(username)

    // Restore server state asynchronously
    loadStateFromServer().then((data) => {
      if (data) {
        useTerminalStore.getState().restoreServerState(data)
      }
    })
  } else {
    setUser(null)
  }
}, [isSignedIn, user, setUser])
```

## Phase 6: Local Redis with Docker Compose

Create `docker-compose.yml` at project root:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

## Phase 7: Edge Cases

| Scenario | Behavior |
|----------|----------|
| No server state yet | `loadServerState` returns null → skip restore, use local state |
| Server unreachable | Fire-and-forget sync silently fails; local state unaffected |
| Sign in first time | No server state → local state is used, then synced on first write |
| Sign in on new device | Server state overwrites local state on sign-in |
| Sign out | Server state preserved in Redis for next sign-in |
| Clerk not configured | `syncStateToServer()`/`loadStateFromServer()` bail early (user is null) |
| Corrupt server data | `restoreServerState` validates shape, rejects with null |

## Files Changed

| File | Action |
|------|--------|
| `package.json` | Add `ioredis`, `@types/ioredis`, `@clerk/backend` |
| `.env.local` | Add `REDIS_URL` |
| `docker-compose.yml` | **Create** — Redis 7 Alpine |
| `src/lib/serverStorage.ts` | **Create** — server functions + client wrappers |
| `src/lib/terminalStore.ts` | Add `restoreServerState` action + sync calls |
| `src/lib/auth.tsx` | Call `loadStateFromServer()` after user is set |

## Build Checklist

- [ ] Phase 1: Install `ioredis` + `@clerk/backend`, configure env
- [ ] Phase 2: Create `src/lib/serverStorage.ts` with server functions
- [ ] Phase 3: Add `restoreServerState` action to `terminalStore.ts`
- [ ] Phase 4: Wire sync triggers into all localStorage write sites
- [ ] Phase 5: Integrate `loadStateFromServer()` into `auth.tsx`
- [ ] Phase 6: Create `docker-compose.yml` for local Redis
- [ ] Phase 7: Verify all edge cases
