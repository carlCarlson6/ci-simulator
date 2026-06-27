# Implementation Plan: Multi-Tab Sessions

**Goal:** Add support for multiple terminal tabs side-by-side or as tabbed views, each with its own state (working directory, command history, output buffer).

**Status:** 📝 Planned

---

## Overview

Each tab is an independent terminal session backed by its own Zustand slice. A top-level tab bar lets users create, switch between, and close tabs. Tabs share the same filesystem (all operations affect the same in-memory FS and storage), but each has its own `cwd`, history, and output lines.

**Architecture Pattern:** Store holds `tabs: TabSession[]` array; `activeTabId` picks the active session. Terminal components read from the active tab's state.

---

## Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Tabs share one filesystem** — single `FileSystem` instance across all tabs | Consistency; avoids confusing file-per-tab semantics |
| 2 | **Each tab has its own `cwd`, history, output lines, and prompt** | Real terminal tabs are independent sessions |
| 3 | **Tab bar at top of terminal** — thin horizontal strip with tab names + close buttons | Familiar UX; consistent with browser/workbench conventions |
| 4 | **Max 8 tabs** | Prevents UI clutter; practical limit |
| 5 | **Tabs persisted to `localStorage`** — tab state (including history and cwd) survives refresh | Matches existing persistence pattern |
| 6 | **Zustand store becomes `slices` pattern** — shared state + per-tab state | Clean separation; avoids deep nesting |

---

## Micro-Decisions

| # | Decision | Rationale |
|---|---|---|
| A | Tab creation via `Ctrl+T` keyboard shortcut or `new-tab` command | Both methods for convenience |
| B | Close tab via close button on tab bar or `Ctrl+W` | Standard shortcuts |
| C | Closing last tab: not allowed — at least one tab must remain | Prevents blank terminal |
| D | Tab names: auto-named "Terminal 1", "Terminal 2", etc. or custom name via `rename-tab <name>` | Support both |
| E | Tab bar styling: same terminal green-on-black with active tab highlighted | Consistent with theme system |
| F | Tab switch animation: instant, no transition | Performance; terminal should feel snappy |

---

## Files to Modify

### 1. `src/lib/terminalStore.ts` — Refactor to multi-tab store

**Structural change**: Extract per-tab state into a `TabSession` interface:

```ts
interface TabSession {
  id: string
  name: string
  lines: OutputLine[]
  currentPath: string
  commandHistory: string[]
  historyIndex: number
  currentInput: string
  cursorPosition: number
}
```

**Store holds**:
```ts
tabs: TabSession[]
activeTabId: string
```

**Active tab operations** — getters/actions that delegate to the active tab:
- `activeLines`, `activePath`, `activeHistory`, etc. (derived)
- `addLine`, `setCurrentPath`, etc. (actions that modify `tabs` array)

**Convenience actions**:
- `createTab(name?: string)`: push new `TabSession` to `tabs`, set `activeTabId`
- `closeTab(id: string)`: remove from `tabs`, activate nearest sibling
- `activateTab(id: string)`: set `activeTabId`

### 2. `src/components/Terminal.tsx` — Add tab bar

**New component**: `<TabBar />` rendered above the terminal output area:

- Row of tab buttons with close `×` buttons
- Active tab highlighted
- `+` button at right edge to create new tab
- `Ctrl+T` / `Ctrl+W` keyboard handlers

### 3. `src/components/TerminalOutput.tsx` — Use active tab's lines

Read lines from `activeLines` (derived from active tab).

### 4. `src/components/TerminalInput.tsx` — Use active tab's input state

Read/write `currentInput`, `cursorPosition`, `commandHistory` from active tab.

### 5. `src/lib/fileSystem.ts` — No changes needed

Tabs share one filesystem, so the existing `FileSystem` instance is unaffected.

### 6. `src/lib/commands/index.ts` — Ensure dispatch uses active tab's path

The `context.currentPath` should derive from `activePath`.

---

## Files to Create

### 7. `src/components/TabBar.tsx` — Tab bar component

Props / store access:
- List of tabs (name, id, isActive)
- `onActivate`, `onClose`, `onCreate` callbacks

### 8. `src/lib/commands/new-tab.ts` — Create tab command (optional)

```ts
export const HELP_TEXT = '  new-tab                Create a new terminal tab'
```

---

## Testing Checklist

1. `Ctrl+T` creates new tab with fresh prompt, separate cwd/history
2. Tab bar shows both tabs; clicking switches between them
3. Each tab maintains independent command history (up arrow)
4. Filesystem operations in one tab visible in another (shared FS)
5. `Ctrl+W` closes active tab; next tab activates
6. Closing last tab → prevented (or replaced with empty tab)
7. Page refresh → tabs restored from localStorage
8. Theme switch → tab bar adopts new theme colors

---

## Status

**Status:** 📝 Planned — not yet implemented.

---

## Related Documents

- [P005-filesystem-localstorage-persistence.md](../P005-filesystem-localstorage-persistence.md) — Persistence pattern to follow for tab storage
