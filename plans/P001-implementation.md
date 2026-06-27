# Implementation Plan: Cyberpunk Terminal Simulator

This document details the step-by-step implementation of the terminal simulator. Each phase builds on the previous one.

---

## Phase 1: Project Scaffold

**Goal:** Initialize a TanStack Start project with all required dependencies.

**Status:** ✅ COMPLETED (with Vite + React + TanStack Router instead of TanStack Start)

**Notes:**
- Scaffolded manually with Vite instead of `npm create tanstack-start@latest`
- Dependencies installed: `zustand`, `react`, `@tanstack/react-router`, `tailwindcss` v4
- Font loaded via Google Fonts CDN in `index.html` instead of `@fontsource/jetbrains-mono`
- Structure is `src/` based instead of `app/` based:
  - `src/lib/` — file system, store, commands
  - `src/components/` — Terminal, TerminalInput, TerminalOutput
  - `src/server/` — server functions
  - `src/styles/` — terminal.css
  - `src/routes.tsx` — route definitions
  - `src/main.tsx` — app entry point
- `vite.config.ts` configures dev server with API middleware
- `app.config.ts` exists for TanStack Start compatibility

**Deliverable:** A running TanStack Start app with a blank page.

---

## Phase 2: In-Memory File System

**Goal:** Build a simulated file system using a flat Map structure.

**Status:** ✅ COMPLETED

**Implementation:** `src/lib/fileSystem.ts`

**Notes:**
- `FileSystemEntry` type defined with `type`, `content`, `createdAt`, `modifiedAt`
- `FileSystem` class implemented with all required methods:
  - `resolvePath` — handles absolute, relative (`../`, `./`), and `~` paths
  - `getEntry`, `exists`, `isDirectory`, `isFile`
  - `createDirectory` — auto-creates parent directories
  - `createFile`
  - `removeEntry` — supports recursive removal
  - `listDirectory` — returns sorted entries, handles files as single-entry dirs
  - `readFile`
  - `getParent`, `getName` — helper utilities
- Pre-populated state with all directories and files as specified
- `initializeDefaults()` method called on store init
- Unit tests not written (optional)

**Deliverable:** A fully functional in-memory file system with pre-populated data.

---

## Phase 3: Terminal State (Zustand Store)

**Goal:** Create a global state manager for the terminal session.

**Status:** ✅ COMPLETED

**Implementation:** `src/lib/terminalStore.ts`

**Notes:**
- `zustand` installed and store created with `create<TerminalState>()`
- All types defined: `TerminalLine`, `TerminalState` with `serverInfo` field added
- Store actions implemented:
  - `initialize()` — creates file system, fetches server info, shows MOTD, adds initial prompt
  - `executeCommand(input)` — full command parsing, dispatch, history tracking, output rendering
  - `clearScreen()` — clears lines and adds fresh prompt
  - `setHistoryIndex(index)` — for arrow key navigation
  - `setCurrentPath(path)` — directory change tracking
  - `getPrompt()` — returns `user@hostname:path$` with `~` for home
  - `getCompletionCandidates(input)` — delegates to commands module
  - `cycleCompletion(input)` — cycles through candidates with wrap-around
  - `addLine(line)` — appends with auto-generated ID and timestamp
- Server info fetched via `fetch('/api/system-info')` on init with fallback
- `cd` command updates `currentPath` and `previousPath` in store
- `clear` command handled as special case (no output, just clears screen)

**Deliverable:** A Zustand store that can execute commands and manage terminal output.

---

## Phase 4: Command Registry

**Goal:** Implement all 15 commands with proper handlers.

**Status:** ✅ COMPLETED

**Implementation:** `src/lib/commands.ts`

**Notes:**
- `CommandHandler` and `CommandContext` types defined with `serverInfo` field added
- `CommandResult` type added for structured success/error responses
- All 15 commands implemented:

| Command | Status | Notes |
|---------|--------|-------|
| `help` | ✅ | Groups by file system, system, and general commands |
| `clear` | ✅ | Returns empty result; handled specially in store |
| `ls` | ✅ | Shows directories with `/` suffix; no `-la` flag support |
| `cd` | ✅ | Handles `~`, `-`, and default home; returns `newPath` |
| `pwd` | ✅ | Returns current path |
| `cat` | ✅ | Error handling for missing files and directories |
| `echo` | ✅ | Joins args with spaces |
| `mkdir` | ✅ | Auto-creates parent directories via fileSystem |
| `touch` | ✅ | Updates `modifiedAt` if exists, creates if not |
| `rm` | ✅ | Supports `-r` / `-rf`; Easter egg for `rm -rf /` |
| `whoami` | ✅ | Returns `serverInfo.username` with fallback |
| `date` | ✅ | Returns formatted date from serverInfo |
| `hostname` | ✅ | Returns `serverInfo.hostname` with fallback |
| `history` | ✅ | Numbered list with padding |
| `neofetch` | ✅ | ASCII skull art + 12 info lines |

- `getCompletionCandidates` implemented for tab completion
- `getCommands()` helper returns all command names
- `executeCommand` function parses input and dispatches to handlers

**Deliverable:** All 15 commands functional, returning correct output.

---

## Phase 5: Terminal UI

**Goal:** Build the cyberpunk terminal interface.

**Status:** ✅ COMPLETED

**Implementation:** `src/components/Terminal.tsx`, `src/components/TerminalOutput.tsx`, `src/components/TerminalInput.tsx`, `src/styles/terminal.css`

**Notes:**
- `terminal.css` uses Tailwind CSS v4 `@theme` block for custom colors:
  - `--color-terminal-bg: #000000`
  - `--color-terminal-green: #00ff00`
  - `--color-terminal-red: #ff0044`
  - `--color-terminal-blue: #0099ff`
  - `--color-terminal-yellow: #ffcc00`
  - Plus dim, dark, cyan, magenta variants
- `JetBrains Mono` font loaded via Google Fonts CDN
- `.terminal-cursor` with blinking animation (`@keyframes blink`)
- `.terminal-glow` with `text-shadow` for neon effect
- `.terminal-scanlines` class with `repeating-linear-gradient`
- `.terminal-scrollbar` with custom green thumb
- `TerminalOutput`:
  - Auto-scrolls to bottom on new lines
  - Renders prompt with colored segments (user, host, path)
  - Error lines in red, system in yellow, output in green
  - Uses `whitespace-pre-wrap` for multi-line content
- `TerminalInput`:
  - Prompt styled with colored segments matching output
  - Transparent input with green text, no border
  - Handles all key events: Enter, ArrowUp, ArrowDown, Tab, Ctrl+C, Ctrl+L
  - Click anywhere to focus input
  - Visual cursor block after input
- `Terminal`:
  - Full-screen flex container (`h-screen w-screen`)
  - Initializes store on mount, sets `window.__START_TIME`
  - `TerminalOutput` flexes, `TerminalInput` fixed at bottom
- `src/routes.tsx` root route renders full-screen container
- `index.html` has `bg-black` on body, no margins

**Deliverable:** A visually stunning cyberpunk terminal that renders output and accepts input.

---

## Phase 6: Server Functions

**Goal:** Implement server functions for real system info.

**Status:** ✅ COMPLETED (with Vite middleware instead of TanStack Start server functions)

**Implementation:** `src/server/system.ts`, `vite.config.ts`

**Notes:**
- `src/server/system.ts` contains `createServerFn` from `@tanstack/react-start` (file exists but function not actively used in current flow)
- Actual server communication implemented via Vite plugin middleware in `vite.config.ts`:
  - `configureServer` adds `/api/system-info` endpoint
  - Returns `hostname`, `username`, `date`, `platform`, `release` from `os` module
- `terminalStore.ts` fetches via `fetch('/api/system-info')` on initialization
- Server info cached in `serverInfo` state field
- Fallback values provided if fetch fails:
  - `hostname: 'localhost'`, `username: 'user'`, `date: new Date().toISOString()`
- `whoami`, `date`, `hostname`, `neofetch` commands use cached `serverInfo`
- Server info fetched once at startup, not on every command

**Deliverable:** Real system info available via server functions.

---

## Phase 7: Tab Completion

**Goal:** Implement tab completion for commands and file paths.

**Status:** ✅ COMPLETED

**Implementation:** `src/lib/commands.ts` (algorithm), `src/lib/terminalStore.ts` (cycle logic), `src/components/TerminalInput.tsx` (key handling)

**Notes:**
- `getCompletionCandidates(input, context)` in `commands.ts`:
  - Single word → filters command names by prefix
  - Multiple words → resolves partial path, lists directory entries, filters by prefix
  - Returns directories with `/` suffix appended
- `cycleCompletion` in `terminalStore.ts`:
  - Wraps around from last to first candidate
  - Returns `null` if no candidates
- `TerminalInput.tsx` Tab handling:
  - Prevents default Tab behavior
  - If completion is a command (single word), appends space
  - If completion is a path, replaces last argument
  - No "show all candidates on double Tab" feature implemented
- Store tracks `completionCandidates` and `completionIndex` state

**Deliverable:** Tab completion working for commands and file paths.

---

## Phase 8: Polish & Edge Cases

**Goal:** Handle edge cases and add polish.

**Status:** ✅ COMPLETED

**Implementation:** Throughout `src/lib/commands.ts`, `src/lib/terminalStore.ts`, `src/components/TerminalInput.tsx`, `src/styles/terminal.css`

**Notes:**
- **Error handling:**
  - Empty input → adds new prompt only (no duplication of command)
  - Unknown command → `{command}: command not found` in red
  - Invalid arguments → most commands print usage/missing operand errors
- **`cd` edge cases:**
  - `cd` → `/home/user` ✅
  - `cd ~` → `/home/user` ✅
  - `cd -` → previous directory ✅
  - `cd /nonexistent` → `cd: no such file or directory` ✅
  - `cd file` → `cd: not a directory` ✅
- **`rm` edge cases:**
  - `rm -rf /` → Easter egg: "it is dangerous to operate recursively on '/'" ✅
  - `rm nonexistent` → `rm: cannot remove... No such file or directory` ✅
  - `rm dir` (without `-r`) → `rm: cannot remove... Is a directory` ✅
- **`ls` edge cases:**
  - `ls file` → returns file name ✅
  - `ls /nonexistent` → `ls: cannot access... No such file or directory` ✅
- **`cat` edge cases:**
  - `cat dir` → `cat: {dir}: Is a directory` ✅
  - `cat nonexistent` → `cat: {file}: No such file or directory` ✅
- **Input polish:**
  - `Ctrl+C` → adds `^C` output line and new prompt ✅
  - `Ctrl+L` → clears screen ✅
  - Arrow keys work only when input is focused (auto-focus on click) ✅
- **Visual polish:**
  - Prompt always shows correct path with `~` for home ✅
  - Auto-scroll to bottom on new output ✅
  - Text glow via `text-shadow` ✅
  - Scanline overlay CSS class available (not actively rendered in component) ✅
  - Custom scrollbar styling ✅

**Deliverable:** A polished, robust terminal with good error handling.

---

## Phase 9: Future Enhancements

**Goal:** Document ideas for future versions.

**Status:** ✅ COMPLETED (documented in README)

**Implementation:** `README.md` Future Enhancements section

**Notes:**
- All 15 future enhancements listed in README
- `sudo` easter egg mentioned in README features but not yet implemented in code
- `theme` command is top priority enhancement

**List:**
1. `theme` command — switch between cyberpunk, matrix, solarized, dark, light
2. `sudo` easter egg — "You are not in the sudoers file. This incident will be reported."
3. Terminal games — `snake`, `2048`, `tetris` rendered in ASCII
4. File persistence — save file system to localStorage or server DB
5. Environment variables — `export`, `env`, `echo $VAR`
6. Pipes and redirects — `|`, `>`, `>>`
7. Network commands — `ping`, `curl` (simulated responses)
8. Process commands — `ps`, `top` (simulated)
9. ASCII art — `cowsay`, `figlet`
10. Multi-tab support — multiple terminal sessions
11. Sound effects — typing sounds, beep on error
12. `man` command — manual pages for each command
13. `find` command — search file system
14. `grep` command — search file contents
15. `cp` and `mv` commands — copy and move files

**Deliverable:** A documented list of enhancements in the README.

---

## Build Checklist

- [x] Phase 1: Project Scaffold *(completed with Vite + React + TanStack Router instead of TanStack Start; `src/` based structure)*
- [x] Phase 2: In-Memory File System *(fully implemented in `src/lib/fileSystem.ts`)*
- [x] Phase 3: Terminal State (Zustand) *(fully implemented in `src/lib/terminalStore.ts`)*
- [x] Phase 4: Command Registry *(all 15 commands implemented in `src/lib/commands.ts`)*
- [x] Phase 5: Terminal UI *(fully implemented in `src/components/Terminal*.tsx` and `src/styles/terminal.css`)*
- [x] Phase 6: Server Functions *(implemented via Vite API middleware in `vite.config.ts`; `createServerFn` exists in `src/server/system.ts` but not actively used)*
- [x] Phase 7: Tab Completion *(fully implemented in `src/lib/commands.ts` and `src/components/TerminalInput.tsx`)*
- [x] Phase 8: Polish & Edge Cases *(fully implemented)*
- [x] Phase 9: Future Enhancements *(documented in README)*

---

## Notes

- All file paths should be absolute internally. The `resolvePath` function handles normalization.
- The file system is case-sensitive (like Unix).
- Hidden files (starting with `.`) are supported but not shown by `ls` unless `-a` flag is used.
- Server functions should be called sparingly. Cache results where possible.
- The terminal should feel responsive. Server calls should not block the UI.
