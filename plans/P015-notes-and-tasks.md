# P015 — Notes & Task Management (`tasks` command)

## Context

The terminal simulator currently has no way to track work. This feature adds a **notes + task manager** driven by a new `tasks` command. The goal is two loosely-coupled entities:

- **Notes** — ordinary files under `/notes-app` in the virtual FS, organizable via sub-directories. Managed with the *existing* FS commands (`mkdir`, `edit`, `cat`, `ls`, `md`). No new note infrastructure — notes ride the existing FS → localStorage → Postgres sync for free.
- **Tasks** — `{ id, title, status, dueDate?, notePaths[] }` records persisted in the existing per-user JSONB blob (and localStorage). A task can reference multiple notes by file path.

The `tasks` command exposes **both** a CLI subcommand surface (scriptable) and an **interactive full-screen modal** (a board, mirroring the existing editor/markdown modals).

Decisions locked in during planning:
- Interface: **CLI subcommands + interactive modal** (bare `tasks` opens the board).
- Storage: **extend `ServerStatePayload`** with `tasks?: Task[]` + a localStorage key (no migration, auto-syncs).
- Note linking: store **note file paths**, validate existence on display (flag missing).
- Statuses: **`todo` / `doing` / `blocked` / `done`**.
- Modal: **full management** (add/edit/cycle status/attach/detach/delete + open attached note).
- Due dates: **optional**, `YYYY-MM-DD`, past-due incomplete tasks flagged `!OVERDUE`.
- Notes managed via **existing FS commands**; `/notes-app` created **lazily** on first use.

## Pipeline constraints (from exploration)

- `CommandHandler` is **pure & synchronous** — reads `context`, returns a `CommandResult` data bag. No store/DOM/network/async.
- All side effects (store mutation, opening modals, server calls, async, `addLine`) happen in the registered `CommandEffect`, which receives `CommandEffectContext`. Effects return `'handled'` (took over output) or `'continue'` (fall through to default `data.output` printing).
- The store's `executeCommand` (`terminalStore.ts:139-205`) already runs `persistState` + `syncToServerIfUser` after **every** command — so any change we make to store state via the effect context auto-persists, *provided we extend `persistState`/sync to include tasks*.

## Data model

New type (co-locate in `src/lib/commands/tasks.tsx` or a small `src/lib/tasks.ts`):

```ts
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done'
export type Task = {
  id: number              // sequential, monotonic
  title: string
  status: TaskStatus
  dueDate?: string        // 'YYYY-MM-DD'
  notePaths: string[]     // absolute paths under /notes-app
  createdAt: string       // ISO
}
```

IDs are sequential integers from a monotonic counter (`nextTaskId`) kept alongside the tasks array — do **not** reuse ids on delete. Store as `{ tasks: Task[]; nextTaskId: number }` to avoid recomputing max id.

## Files to change

### 1. `src/lib/db/schema.ts` — extend the payload (no DB migration)
Add optional fields to `ServerStatePayload`:
```ts
tasks?: Task[]
nextTaskId?: number
```
Because they're optional, existing rows still validate. Keep `v: 1` (additive). `isValidPayload` does not need to require them — but if present, do a light shape check (array). Update **both** copies of `isValidPayload`: `server-fns.ts:34-45` and `serverStorage.ts:6-17` (only to *accept* the new optional fields — don't reject payloads lacking them).

### 2. Persistence layer — carry tasks through localStorage + sync
- `src/lib/persistence.ts` / `src/lib/sync.ts`: add a localStorage key `ci-simulator:tasks` storing `{ tasks, nextTaskId }`. Extend `persistState(...)` signature (`sync.ts:11`) to also accept and write tasks, mirroring how `currentPath`/`theme`/`envVars` are written. (Or add a dedicated `saveTasks`/`loadTasks` pair next to `saveFileSystem`.)
- `src/lib/serverStorage.ts` `syncStateToServer` (`19-48`): read the new localStorage key and include `tasks` + `nextTaskId` in the `saveServerState` payload. `loadStateFromServer` already returns the whole payload — consumers read the new fields.
- `src/lib/terminalStore.ts`:
  - Add state: `tasks: Task[]`, `nextTaskId: number`.
  - `initialize` (~`104-117`): load tasks from localStorage alongside env/sound.
  - `restoreServerState` (`297-316`): restore `tasks`/`nextTaskId` from the server payload.
  - Anywhere `persistState(...)` is called (`executeCommand` ~`202`, `saveEditor` ~`263-277`), include the current tasks so they persist. Simplest: have `persistState` read tasks from a passed-in arg sourced from `get()`.

### 3. `src/lib/commands/types.ts` — new signals + effect callbacks
- `CommandResult.data`: add task-action signal fields, e.g. `openTasksModal?: boolean` and a discriminated `tasksOp?: { kind: 'add'|'done'|'status'|'edit'|'attach'|'detach'|'rm'; ... }` (or simpler: let the handler return a fully-formed `tasksMutation` describing the change, and the effect applies it). Keep handlers pure — they only *describe* the mutation; the effect commits it to the store.
- `CommandEffectContext`: add callbacks wired to new store actions:
  - `openTasks: () => void`
  - `applyTaskMutation: (op) => { ok: boolean; message: string }` (mutates store tasks, returns a line to print)
- `CommandContext`: add `tasks: Task[]` so the pure handler can render `tasks ls` text.

### 4. `src/lib/terminalStore.ts` — modal slice + task actions
Add, mirroring the editor/markdown slices:
- State: `tasksOpen: boolean` (modal visibility). Task data already added above.
- Actions: `openTasks()`, `closeTasks()`, and task mutators — `addTask`, `updateTask(id, patch)`, `setTaskStatus(id, status)`, `attachNote(id, path)`, `detachNote(id, path)`, `removeTask(id)`. Each mutator updates state then calls `persistState` + `syncToServerIfUser` (same trailing sequence as `saveEditor`). The modal calls these directly; the CLI effect calls them via the effect-context callbacks.
- Populate `tasks` into the `CommandContext` construction (`152-161`) and wire the new callbacks into the `CommandEffectContext` construction (~`170-186`).

### 5. `src/lib/commands/tasks.tsx` (new) — handler + effect + modal
**Handler** (pure): parse `args` into a subcommand. Validate inputs (reject note paths containing `..`/`\0`, normalize via `fileSystem.resolvePath`, ensure under `/notes-app`). Return `data.output` for read-only ops (`ls`, `notes`), or a `tasksOp`/`openTasksModal` signal for mutating/interactive ops. For `ls`, render the board as text directly from `context.tasks`.

CLI surface:
```
tasks                      open the interactive board (modal)
tasks ls [--status S]      list tasks (text), optional filter
tasks add "title" [--due YYYY-MM-DD]
tasks done <id>            shortcut for status done
tasks status <id> <state>  todo|doing|blocked|done
tasks edit <id> [--title "..."] [--due YYYY-MM-DD]
tasks attach <id> <path>   path resolved under /notes-app
tasks detach <id> <path>
tasks notes <id>           list attached notes (flag missing)
tasks rm <id>
```

**Effect**: if `openTasksModal` → `context.openTasks()`, return `'handled'`. If `tasksOp` → call `context.applyTaskMutation(op)`, `addLine` the result message, return `'handled'`. Read-only ops leave `data.output` and return `'continue'`.

**Note-path validation on display**: when listing a task's notes (`tasks notes` and in the modal), check `fileSystem.exists(path)` and flag missing ones — exactly the pattern `listMyPages` uses for pages (`server-fns.ts:158-199`).

**`TasksModal` component** (co-located, like `EditorModal`/`MarkdownModal` in `edit.tsx`/`md.tsx`): full-screen cyberpunk board subscribing to `tasksOpen`/`tasks`. Keybindings: `↑/↓` navigate, `space` cycle status, `x` mark done, `a` add (inline title prompt), `e` edit, `n` attach note (path prompt), `d` delete, `Enter` open the highlighted task's attached note via the existing `openMarkdown` action, `Esc` close. Past-due incomplete tasks rendered with an `!OVERDUE` accent. Lazily `createDirectory('/notes-app')` when attaching/creating if absent.

### 6. `src/lib/commands/index.ts` — register
- Import `handler`/`effect` from `./tasks`.
- Add `tasks: tasksHandler` to `commands` (`34-65`) and `tasks: tasksEffect` to `commandEffects` (`67-77`).
- Optional: completion branch in `getCompletionCandidates` (`109-152`) — complete subcommand names after `tasks `, and complete `/notes-app` paths for `attach`/`detach`.

### 7. `src/components/Terminal.tsx` — mount the modal
Add `<TasksModal />` next to `<EditorModal />`/`<MarkdownModal />` (~`91-92`), importing from `~/lib/commands/tasks`.

### 8. `src/lib/commands/help.ts` + `man.ts` — docs
Export `MANUAL` + `HELP_TEXT` from `tasks.tsx` and wire into `help.ts` (`34-83`) and `man.ts` (`26-52`), as every command does.

## Reused utilities (do not reinvent)
- `FileSystem`: `resolvePath`, `exists`, `createDirectory`, `writeFile`, `readFile`, `listDirectory` (`src/lib/fileSystem.ts`).
- Modal pattern: `EditorModal`/`openEditor`/`closeEditor` and `MarkdownModal`/`openMarkdown` (`edit.tsx`, `md.tsx`, `terminalStore.ts:246-333`). Open attached notes by reusing `openMarkdown`.
- Async-effect-with-server-sync pattern: `pages.ts:23-63`, `publish.ts:60-80`.
- Persist+sync sequence: copy from `saveEditor` (`terminalStore.ts:263-277`).
- Path-safety precedent (reject `..`/`/`/`\0`): `server-fns.ts:207, 242`.

## Verification

No test runner exists; verify manually + with `tsc`.

1. `npm run dev` (`:3000`).
2. Type-check: `npx tsc --noEmit` — must pass (strict mode).
3. CLI flow:
   - `tasks add "Fix login bug" --due 2026-07-05` → confirms `#1` created.
   - `tasks add "Write docs" --due 2026-06-01` → `tasks ls` shows it `!OVERDUE` (today is 2026-06-29).
   - `tasks status 1 doing`, `tasks done 1` → status changes reflected.
   - `mkdir /notes-app/auth`, `edit /notes-app/auth/login.md` (save via Ctrl+S), `tasks attach 1 auth/login.md`, `tasks notes 1` → note listed; delete the file and re-run → flagged missing.
4. Modal flow: bare `tasks` opens the board; navigate, cycle status with space, add/edit/attach, `Enter` on a task with a note opens the markdown viewer, `Esc` closes.
5. Persistence: reload the page → tasks survive (localStorage). If a Clerk key + Postgres are configured (`docker compose up -d`), sign in, create a task, reload in another session → task syncs from server (exercises extended `ServerStatePayload`).
6. Backward-compat: load an existing user with no `tasks` field in their blob → app works, empty task list, no validation error.
