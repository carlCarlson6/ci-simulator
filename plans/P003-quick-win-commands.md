# Implementation Plan: Quick-Win Commands (P003)

**Status:** ✅ COMPLETED — All phases implemented, TypeScript compiles cleanly, production build succeeds.

This document details the implementation of 11 quick-win commands for the Cyberpunk Terminal Simulator.

---

## Scope

### In Scope (11 commands)

| Batch | Command | Effort | Description |
|-------|---------|--------|-------------|
| A | `cp` | 20m | Copy files; `cp -r` for directories. |
| A | `mv` | 20m | Move/rename files or dirs. Unix behavior. |
| B | `ls -la` / `ls -a` | 25m | Hidden files, permissions, sizes, dates. |
| B | `find` | 20m | Recursive listing, optional `-name` pattern. |
| B | `grep` | 25m | Content search; `-r` for recursive. |
| C | `ping` | 15m | Simulated ICMP with fake latency. |
| C | `ps` | 10m | Static simulated process list. |
| C | `top` | 15m | Snapshot with uptime, load, memory. |
| C | `curl` | 50m | Real HTTP proxy via backend + frontend. |
| D | `sudo` | 5m | Easter egg message. |
| D | `man` | 15m | Static docs object for all commands. |
| D | `cowsay` | 15m | ASCII cow with speech bubble. |

### Out of Scope (Tracked for Future)

- `theme` — needs CSS variable architecture
- `env` / `export` / `echo $VAR` — needs parser rewrite
- `|` / `>` / `>>` — needs execution model changes
- `figlet` — font database complexity
- `snake`, `2048`, `tetris` — game loops, input hijacking
- File persistence (`localStorage`)
- Multi-tab sessions
- Sound effects

---

## Phase 0: Backend Proxy for `curl`

**Status:** ✅ COMPLETED

**File:** `vite.config.ts`

**Goal:** Add `POST /api/proxy-http` endpoint that proxies HTTP requests from the frontend.

**Implementation:**
- Accept JSON body: `{ url, method?, headers?, body? }`
- Use Node.js `http`/`https` or `fetch` to execute the actual request
- Return JSON: `{ status, statusText, headers, body, error? }`
- Handle errors gracefully (DNS failure, timeout, invalid URL)
- Set a timeout (e.g., 10s)

**Deliverable:** Frontend can call `fetch('/api/proxy-http', ...)` to make real HTTP requests.

---

## Phase 1: FileSystem Primitives

**Status:** ✅ COMPLETED

**File:** `src/lib/fileSystem.ts`

### 1.1 `copyEntry(src, dest)`
- Copy a file or directory
- For files: create new file with same content
- For directories (with `-r` flag in command): recursive copy
- Error if source doesn't exist
- Error if destination already exists

### 1.2 `moveEntry(src, dest)`
- Rename/move a file or directory
- Error if source doesn't exist
- Error if destination parent directory doesn't exist (Unix behavior)
- Error if destination already exists
- Update `createdAt` and `modifiedAt` at destination

**Deliverable:** `FileSystem` class supports `cp` and `mv` commands.

---

## Phase 2: File Discovery Commands

**Status:** ✅ COMPLETED

**File:** `src/lib/commands.ts`

### 2.1 `ls` flags
- Parse flags from args: `-a`, `-l`, `-la`, `-al`
- `-a`: show hidden files (starting with `.`)
- `-l`: long format with fake permissions, owner, size, date
- Fake permissions: dirs `drwxr-xr-x`, files `-rw-r--r--`
- Fake owner: `user`
- Fake size: based on content length or `4096` for dirs
- Date format: `MMM DD HH:MM`

### 2.2 `find`
- `find [path]` — recursively list all entries under path
- `find [path] -name <pattern>` — filter by exact name or simple glob (`*`)
- Default path: current directory
- Output: one path per line

### 2.3 `grep`
- `grep <pattern> [file...]` — search for pattern in file contents
- `grep -r <pattern> [dir...]` — recursive search in directories
- Show matching lines with filename prefix if multiple files
- Highlight the matched part (wrap in ANSI-style markers, or just print line)
- Error if pattern missing
- Error if file doesn't exist

**Deliverable:** File discovery commands work with sensible output.

---

## Phase 3: Simulated System Commands

**Status:** ✅ COMPLETED

**File:** `src/lib/commands.ts`

### 3.1 `ping`
- `ping <host>` — simulate 4 ICMP echo requests
- Random latency per packet: 10-100ms
- Format: `64 bytes from {host} ({ip}): icmp_seq={n} ttl=64 time={lat}ms`
- Summary: `--- {host} ping statistics ---`, packets sent/received, loss %, avg time
- `ping -c <count> <host>` — custom packet count
- Easter egg: `ping 127.0.0.1` gets faster responses

### 3.2 `ps`
- Static process list with fake PIDs, CPU%, MEM%
- Columns: `PID`, `USER`, `CPU%`, `MEM%`, `COMMAND`
- Processes: `cts` (shell), `browser`, `kernel`, `init`, `zsh`, `neural-link`, `systemd`
- Sort by PID ascending

### 3.3 `top`
- Static snapshot (not interactive)
- Header: uptime, users, load average, tasks, CPU%, memory
- Table: same columns as `ps` but sorted by CPU% descending
- Use `window.__START_TIME` for uptime
- Generate random but consistent-looking stats

### 3.4 `curl`
- `curl <url>` — validate URL, call backend proxy
- Display response: status line, headers, body (truncated if >500 lines)
- `curl -I <url>` — HEAD request, show headers only
- Error handling: show backend error messages in red
- Format output with terminal line wrapping

**Deliverable:** System commands return convincing simulated output.

---

## Phase 4: Fun / Polish Commands

**Status:** ✅ COMPLETED

**File:** `src/lib/commands.ts`

### 4.1 `sudo`
- Any usage: `sudo: You are not in the sudoers file. This incident will be reported.`
- No actual privilege escalation

### 4.2 `man`
- `man <command>` — return static doc string for each command
- `man` with no args: `man: What manual page do you want?`
- Unknown command: `man: No manual entry for {command}`
- Docs include: name, synopsis, description, examples
- Update `help` command to mention `man`

### 4.3 `cowsay`
- `cowsay [message]` — ASCII cow with speech bubble
- Default message: `"moo"` or `"Hello, world!"`
- Bubble width adapts to message length
- Cow art:
  ```
    ^__^
    (oo)\_______
    (__)\       )\/\
        ||----w |
        ||     ||
  ```

**Deliverable:** Fun commands add personality to the terminal.

---

## Phase 5: Integration & Polish

**Status:** ✅ COMPLETED

**File:** `src/lib/commands.ts`, `src/lib/terminalStore.ts`

- Update `help` command to include all new commands ✅
- Ensure `getCompletionCandidates` includes new command names ✅
- Test each command manually ✅
- Verify error messages are red and properly formatted ✅

**Note:** `terminalStore.ts` was modified to add async `curl` handling (fetch to backend proxy), contrary to the original plan constraint.

**Deliverable:** All 11 commands accessible from the terminal.

---

## Files Modified

| File | Phases | Changes |
|------|--------|---------|
| `src/lib/fileSystem.ts` | 1 | `copyEntry()`, `moveEntry()` |
| `src/lib/commands.ts` | 2, 3, 4, 5 | New command handlers, `ls` updates, `help` update |
| `vite.config.ts` | 0 | `/api/proxy-http` endpoint |

---

## Build Checklist

- [x] Phase 0: Backend Proxy for `curl` (`vite.config.ts`)
- [x] Phase 1: FileSystem Primitives (`copyEntry()`, `moveEntry()`)
- [x] Phase 2: File Discovery Commands (`ls -la`, `find`, `grep`)
- [x] Phase 3: Simulated System Commands (`ping`, `ps`, `top`, `curl`)
- [x] Phase 4: Fun / Polish Commands (`sudo`, `man`, `cowsay`)
- [x] Phase 5: Integration & Polish (`help` update, `terminalStore.ts` curl async)
- [x] TypeScript compiles cleanly (`npx tsc --noEmit`)
- [x] Production build succeeds (`npm run build`)

---

## Verification Steps

All verification steps completed during development:

1. ✅ `cp welcome.txt copy.txt` then `cat copy.txt` — content matches
2. ✅ `cp -r documents docs_backup` then `ls docs_backup` — recursive copy works
3. ✅ `mv copy.txt renamed.txt` then `cat renamed.txt` — file renamed
4. ✅ `ls -la` — shows hidden files, permissions, sizes
5. ✅ `find /` — lists all filesystem entries
6. ✅ `grep Upgrade documents/notes.txt` — shows matching line
7. ✅ `grep -r cyberdeck /home/user` — recursive search
8. ✅ `ping localhost` — 4 packets, summary stats
9. ✅ `ps` — table of fake processes
10. ✅ `top` — snapshot with header + process table
11. ✅ `curl -I https://example.com` — returns headers via backend
12. ✅ `sudo ls` — easter egg message
13. ✅ `man ls` — shows manual page
14. ✅ `cowsay Hello` — ASCII cow with bubble
15. ✅ `help` — lists all commands including new ones

---

## Notes

- `curl` is the only command requiring backend changes.
- All other commands are pure frontend additions.
- `terminalStore.ts` was modified to handle async `curl` output (backend fetch), contrary to the original P002 constraint.
- `Terminal.tsx`, `TerminalOutput.tsx`, and `TerminalInput.tsx` were left untouched.
- Error handling follows existing patterns: red error messages, specific error strings.
- Fake permissions in `ls -l` use sensible defaults since there's no real permission model.
