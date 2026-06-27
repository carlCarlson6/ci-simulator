# Implementation Plan: Additional Server Functions (`date`, `hostname`, etc.)

**Goal:** Add `date` and `hostname` commands backed by real system data via TanStack Start `createServerFn`, following the `curl` pattern.

**Status:** 📝 Planned

---

## Overview

New commands that call server functions to retrieve real system information: the current server date/time and hostname. These follow the exact same pattern as `curl` — a `.server.ts` file with the actual logic, a `.functions.ts` file with `createServerFn` wrappers, and command handlers that call the functions.

**Architecture Pattern:** `createServerFn` → command handler → output (identical to `curl`).

---

## Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Follow existing `curl` pattern** — server function file + command handler file | Consistent architecture; minimal cognitive overhead |
| 2 | **`date` returns formatted server date/time** — use `Intl.DateTimeFormat` on server | No external dependency; timezone respects server locale |
| 3 | **`hostname` returns `os.hostname()`** from Node.js `os` module | Real system data, same as `curl` uses `http` |
| 4 | **Both commands are server-only** — fail gracefully if server unavailable | Matches `curl` error handling pattern |
| 5 | **Support `date` with format string** — `date +%Y-%m-%d` as bonus | Extended functionality beyond basic `date` |

---

## Micro-Decisions

| # | Decision | Rationale |
|---|---|---|
| A | `date` with no args → default format: `Thu Jun 27 2026` | Human-readable, matches `date` without format string |
| B | `date +%Y-%m-%d` → `2026-06-27` | Support basic strftime-like format specifiers |
| C | `hostname` with no args → prints hostname | Simple, no flags initially |
| D | Server functions cache? No — each call fetches fresh data | System info changes infrequently but no caching needed |
| E | Error fallback: if server call fails → `date: unable to reach server` | Graceful degradation |

---

## Files to Create

### 1. `src/lib/system.functions.ts` — Server functions

```ts
import { createServerFn } from '@tanstack/react-start'

export const getDate = createServerFn({ method: 'GET' }).handler(async () => {
  'use server'
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })
})

export const getHostname = createServerFn({ method: 'GET' }).handler(async () => {
  'use server'
  const os = await import('node:os')
  return os.hostname()
})
```

### 2. `src/lib/system.server.ts` — Server-only helpers (optional)

May not be needed if the logic is simple enough to inline in the `createServerFn`. If format-string parsing for `date` is needed, put it here.

### 3. `src/lib/commands/date.ts` — Date command handler

```ts
export const MANUAL = 'date\n\nDisplay the current date and time.\n\nUsage: date [format]'
export const HELP_TEXT = '  date                   Display current date/time'
```

**Handler logic**:
1. Call `getDate()` server function
2. If args: support `+%Y-%m-%d` style format (parse format string, build output)
3. Return result as output line

### 4. `src/lib/commands/hostname.ts` — Hostname command handler

```ts
export const MANUAL = 'hostname\n\nDisplay the system hostname.\n\nUsage: hostname'
export const HELP_TEXT = '  hostname               Display system hostname'
```

**Handler logic**:
1. Call `getHostname()` server function
2. Return result as output line

---

## Files to Modify

### 5. `src/lib/commands/index.ts` — Register commands

Add `date` and `hostname` to command registry.

### 6. `src/lib/commands/help.ts` — Add help text

### 7. `src/lib/commands/man.ts` — Add manual pages

---

## Testing Checklist

1. `date` → shows server date (e.g. `Thu Jun 27 2026`)
2. `hostname` → shows server hostname
3. Multiple rapid calls to `date` → each returns fresh timestamp
4. `help` → shows `date` and `hostname` in list
5. `man date` → shows manual page
6. Works alongside existing `curl` commands (no conflicts)

---

## Status

**Status:** 📝 Planned — not yet implemented.

---

## Related Documents

- [P006-tanstack-start-migration.md](../P006-tanstack-start-migration.md) — Established the `createServerFn` pattern used here
- [P003-quick-win-commands.md](../P003-quick-win-commands.md) — `curl` command is the precedent for server-backed commands
