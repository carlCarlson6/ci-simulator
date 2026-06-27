# Filesystem Persistence via localStorage — Implementation Plan

**Goal:** Persist the in-memory filesystem to `localStorage` so user-created files, directories, and edits survive browser refreshes.

**Architecture:** Add a thin persistence layer that serializes the `FileSystem.entries` Map to JSON on every mutating command, and hydrates from `localStorage` on store initialization. A `reset` command clears storage and restores defaults. The `FileSystem` class itself gains `serialize()`/`deserialize()`/`clear()` methods so the persistence module has zero knowledge of internal Map structure.

**Tech Stack:** React 19, TypeScript, Vite, Zustand v5, `localStorage` (browser standard API)

## Global Constraints

- Keep all changes in `src/lib/` and `src/components/Terminal.tsx`.
- Do not add new dependencies.
- Do not modify the flat-Map data model in `FileSystem` (keys are absolute paths).
- Do not persist `currentPath`, `previousPath`, or `history` — filesystem entries only.
- Storage key: `ci-simulator:filesystem`.
- Storage format: `{ version: number, entries: [string, FileSystemEntry][] }`.
- `version` starts at `1` for forward-compatible migrations.
- Save after every command execution; the filesystem state is tiny so simplicity wins.
- If stored data is corrupted, has wrong version, or invalid shape, silently drop it and fall back to defaults.
- On `localStorage` quota error (`QuotaExceededError`), silently ignore — do not crash the terminal.

---

## Files

| File | Action | Responsibility |
|------|--------|--------------|
| `src/lib/persistence.ts` | **Create** | Storage engine: save/load/clear/validate filesystem state. |
| `src/lib/fileSystem.ts` | **Modify** | Add `serialize()`, `deserialize()`, `clear()`, and a static `fromSerialized()` factory. |
| `src/lib/terminalStore.ts` | **Modify** | Hydrate filesystem from storage in `initialize()`; save filesystem after every command in `executeCommand()`. |
| `src/lib/commands.ts` | **Modify** | Add a `reset` command that clears storage and re-initializes defaults. |
| `src/components/Terminal.tsx` | **Modify** | Ensure `initialize()` is called correctly with the new hydration flow (no duplicate init). |

---

### Task 1: Add serialize / deserialize / clear to `FileSystem`

**Files:**
- Modify: `src/lib/fileSystem.ts`
- Test: Manual via browser devtools (no test framework exists in repo)

**Interfaces:**
- Consumes: `FileSystemEntry` type (already defined)
- Produces:
  - `FileSystem.serialize(): [string, FileSystemEntry][]`
  - `FileSystem.deserialize(entries: [string, FileSystemEntry][]): void`
  - `FileSystem.clear(): void`
  - `FileSystem.fromSerialized(entries: [string, FileSystemEntry][]): FileSystem` (static factory)

- [x] **Step 1: Add `serialize()` method**

Add after `initializeDefaults()` (end of class):

```typescript
serialize(): [string, FileSystemEntry][] {
  return Array.from(this.entries.entries())
}
```

- [x] **Step 2: Add `deserialize()` method**

```typescript
deserialize(data: [string, FileSystemEntry][]): void {
  this.entries.clear()
  for (const [path, entry] of data) {
    this.entries.set(path, entry)
  }
}
```

- [x] **Step 3: Add `clear()` method**

```typescript
clear(): void {
  this.entries.clear()
  this.createDirectory('/')
}
```

- [x] **Step 4: Add static `fromSerialized()` factory**

After the class definition (outside the class body):

```typescript
export function createFileSystemFromSerialized(
  entries: [string, FileSystemEntry][]
): FileSystem {
  const fs = new FileSystem()
  fs.deserialize(entries)
  return fs
}
```

- [x] **Step 5: Verify in browser console**

Open devtools, run:
```js
const { FileSystem } = await import('/src/lib/fileSystem.ts')
const fs = new FileSystem()
fs.initializeDefaults()
const data = fs.serialize()
console.log(data)
const fs2 = new FileSystem()
fs2.deserialize(data)
console.log(fs2.listDirectory('/home/user'))
```

Expected: `['welcome.txt', 'projects/']` printed.

- [x] **Step 6: Commit**

```bash
git add src/lib/fileSystem.ts
git commit -m "feat(filesystem): add serialize, deserialize, clear, and fromSerialized factory"
```

---

### Task 2: Build the persistence layer (`src/lib/persistence.ts`)

**Files:**
- Create: `src/lib/persistence.ts`
- Test: Manual via browser devtools

**Interfaces:**
- Consumes: `FileSystemEntry`, `FileSystem.serialize()` from Task 1
- Produces:
  - `saveFileSystem(fs: FileSystem): void`
  - `loadFileSystem(): [string, FileSystemEntry][] | null`
  - `clearFileSystemStorage(): void`

- [x] **Step 1: Define storage key and version**

```typescript
const STORAGE_KEY = 'ci-simulator:filesystem'
const STORAGE_VERSION = 1
```

- [x] **Step 2: Define persisted shape type**

```typescript
type PersistedFileSystem = {
  version: number
  entries: [string, FileSystemEntry][]
}
```

- [x] **Step 3: Write `saveFileSystem()`**

```typescript
export function saveFileSystem(fs: FileSystem): void {
  try {
    const payload: PersistedFileSystem = {
      version: STORAGE_VERSION,
      entries: fs.serialize(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Silently ignore quota errors or private-mode restrictions
  }
}
```

- [x] **Step 4: Write `loadFileSystem()`**

```typescript
export function loadFileSystem(): [string, FileSystemEntry][] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as PersistedFileSystem

    if (
      typeof parsed.version !== 'number' ||
      parsed.version !== STORAGE_VERSION ||
      !Array.isArray(parsed.entries)
    ) {
      return null
    }

    // Validate each entry has the expected shape
    for (const [path, entry] of parsed.entries) {
      if (typeof path !== 'string' || !entry || !['file', 'directory'].includes(entry.type)) {
        return null
      }
    }

    return parsed.entries
  } catch {
    return null
  }
}
```

- [x] **Step 5: Write `clearFileSystemStorage()`**

```typescript
export function clearFileSystemStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}
```

- [x] **Step 6: Verify in browser console**

```js
const { FileSystem } = await import('/src/lib/fileSystem.ts')
const { saveFileSystem, loadFileSystem, clearFileSystemStorage } = await import('/src/lib/persistence.ts')
const fs = new FileSystem()
fs.initializeDefaults()
fs.createFile('/home/user/test.txt', 'hello')
saveFileSystem(fs)
console.log(localStorage.getItem('ci-simulator:filesystem'))
const loaded = loadFileSystem()
console.log(loaded?.find(([p]) => p === '/home/user/test.txt'))
clearFileSystemStorage()
console.log(localStorage.getItem('ci-simulator:filesystem'))
```

Expected: saved JSON, then `['/home/user/test.txt', { type: 'file', content: 'hello' }]`, then `null`.

- [x] **Step 7: Commit**

```bash
git add src/lib/persistence.ts
git commit -m "feat(persistence): add localStorage save/load/clear for filesystem"
```

---

### Task 3: Integrate persistence into `terminalStore.ts`

**Files:**
- Modify: `src/lib/terminalStore.ts`
- Test: Manual browser refresh tests

**Interfaces:**
- Consumes: `saveFileSystem`, `loadFileSystem` from Task 2; `createFileSystemFromSerialized` from Task 1
- Produces: `initialize()` now hydrates from storage if present; `executeCommand()` now auto-saves.

- [x] **Step 1: Import persistence helpers**

Add to the top of `src/lib/terminalStore.ts`:

```typescript
import { saveFileSystem, loadFileSystem } from './persistence'
import { createFileSystemFromSerialized } from './fileSystem'
```

- [x] **Step 2: Modify `initialize()` to hydrate from storage**

Replace the existing `initialize` implementation:

```typescript
initialize: () => {
  const stored = loadFileSystem()
  const fs = stored ? createFileSystemFromSerialized(stored) : new FileSystem()
  if (!stored) {
    fs.initializeDefaults()
  }

  set({
    fileSystem: fs,
    lines: [],
    history: [],
    currentPath: '/home/user',
    previousPath: '/home/user',
  })

  const motd = fs.readFile('/etc/motd')
  if (motd) {
    get().addLine({ type: 'system', content: motd })
  }
}
```

Key behavior:
- If `loadFileSystem()` returns entries → deserialize them into a new `FileSystem`.
- If `loadFileSystem()` returns `null` → create fresh `FileSystem` and run `initializeDefaults()`.
- `currentPath`, `history`, `lines` always reset on init (out of scope per user request).

- [x] **Step 3: Auto-save after command execution**

In `executeCommand`, after all command handling finishes (just before the final `return` or at the very end of the function), add:

```typescript
saveFileSystem(state.fileSystem)
```

Place it at the end of `executeCommand` so it fires for every command, mutating or not. The save is cheap.

- [x] **Step 4: Commit**

```bash
git add src/lib/terminalStore.ts
git commit -m "feat(store): hydrate filesystem from localStorage on init, auto-save after commands"
```

---

### Task 4: Add `reset` command to clear persisted state

**Files:**
- Modify: `src/lib/commands.ts`
- Test: Manual in terminal

**Interfaces:**
- Consumes: `clearFileSystemStorage` from Task 2
- Produces: `reset` command handler added to `commands` registry

- [x] **Step 1: Import `clearFileSystemStorage`**

Add to the top of `src/lib/commands.ts`:

```typescript
import { clearFileSystemStorage } from './persistence'
```

- [x] **Step 2: Add `reset` command handler**

Add inside the `commands` record, after `history`:

```typescript
reset: (_args, context) => {
  clearFileSystemStorage()
  context.fileSystem.clear()
  context.fileSystem.initializeDefaults()
  return {
    success: true,
    data: { output: 'Filesystem reset to defaults. Refresh to apply clean state.' },
  }
},
```

- [x] **Step 3: Add `reset` to the `help` output**

In the `help` command output array, add after `history`:

```typescript
'  reset                 Reset filesystem to defaults (clears storage)',
```

- [x] **Step 4: Add `reset` man page**

Add to `manPages`:

```typescript
reset: 'reset\n\nReset the filesystem to default state and clear localStorage.\n\nUsage: reset',
```

- [x] **Step 5: Manual test**

1. Run `touch myfile.txt`
2. Refresh browser → `myfile.txt` should still exist
3. Run `reset`
4. Refresh browser → `myfile.txt` should be gone, defaults restored

- [x] **Step 6: Commit**

```bash
git add src/lib/commands.ts
git commit -m "feat(commands): add reset command to clear persisted filesystem"
```

---

### Task 5: Ensure `Terminal.tsx` init is safe with hydration

**Files:**
- Modify: `src/components/Terminal.tsx`
- Test: Manual refresh tests

**Interfaces:**
- Consumes: Updated `initialize()` from Task 3
- Produces: No change to component API

- [x] **Step 1: Review current `useEffect`**

Current code:

```typescript
useEffect(() => {
  if (!initialized.current) {
    initialized.current = true
    ;(window as any).__START_TIME = Date.now()
    initialize()
  }
}, [initialize])
```

This is already safe (runs once due to `initialized` ref). No changes needed unless `initialize` is recreated on every render by Zustand.

- [x] **Step 2: Verify Zustand selector stability**

`initialize` is pulled with `useTerminalStore((state) => state.initialize)`. In Zustand v5, this selector returns a stable reference because `initialize` is defined once in the store factory. The `useEffect` dependency is safe.

**No file changes required for this task.**

- [x] **Step 3: Commit (no-op or skip)**

If no changes are made, skip the commit.

---

### Task 6: End-to-end manual verification

**Files:** None — manual QA

**Interfaces:** Full system integration

- [x] **Step 1: Create and persist a file**

In terminal:
```
touch persistent.txt
cat persistent.txt
```
Refresh browser.
Run:
```
ls
```
Expected: `persistent.txt` listed.

- [x] **Step 2: Create nested directories**

```
mkdir -p /home/user/deep/nested/dir
touch /home/user/deep/nested/dir/file.md
ls -tree /home/user/deep
```
Refresh browser.
```
ls -tree /home/user/deep
```
Expected: nested structure intact.

- [x] **Step 3: Delete a default file**

```
rm /home/user/welcome.txt
ls /home/user
```
Refresh browser.
```
ls /home/user
```
Expected: `welcome.txt` gone.

- [x] **Step 4: Corrupt storage and verify fallback**

In devtools console:
```js
localStorage.setItem('ci-simulator:filesystem', '{invalid json}')
```
Refresh browser.
Expected: Terminal loads with default files (no crash, no error output).

- [x] **Step 5: Verify reset command**

```
touch will_be_gone.txt
reset
```
Refresh browser.
```
ls
```
Expected: `will_be_gone.txt` gone, defaults restored.

- [x] **Step 6: Verify quota error handling**

In devtools console, fill localStorage with junk until quota is exceeded, then run any command.
Expected: Terminal continues working; no crash.

- [x] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: persist filesystem to localStorage across refreshes"
```

---

## Spec Coverage Check

| Requirement | Task |
|-------------|------|
| Store filesystem in localStorage | Task 2 (persistence layer) |
| Survive page refresh | Task 3 (hydration + auto-save) |
| Filesystem-only scope (no path/history) | Task 3 (only `fileSystem` is saved/loaded) |
| Graceful fallback on corrupted storage | Task 2 (`loadFileSystem` returns `null` on invalid data) |
| User reset capability | Task 4 (`reset` command) |
| No new dependencies | Global constraint (uses built-in `localStorage`) |
| Quota error safety | Task 2 (try/catch in `saveFileSystem`) |

## Placeholder Scan

- No "TBD", "TODO", or "implement later" strings.
- No vague instructions like "add appropriate error handling" — all error handling is explicit.
- No "similar to Task N" shortcuts — each task is self-contained.
- All function signatures, types, and method names are consistent across tasks.

**Plan complete and saved to `docs/superpowers/plans/2026-06-27-filesystem-localstorage-persistence.md`.**

---

## ✅ Execution Record

**Status:** All tasks implemented and committed on 2026-06-27.

**Commits:**
1. `feat(filesystem): add serialize, deserialize, clear, and fromSerialized factory`
2. `feat(persistence): add localStorage save/load/clear for filesystem`
3. `feat(store): hydrate filesystem from localStorage on init, auto-save after commands`
4. `feat(commands): add reset command to clear persisted filesystem`
5. `feat: persist filesystem to localStorage across refreshes` (final — docs update)

**Notes:**
- Task 5 (Terminal.tsx init safety) required no file changes; the existing `initialized` ref guard was already sufficient.
- Commands are modularized in `src/lib/commands/` (not a single `commands.ts`), so `reset` was added as `src/lib/commands/reset.ts` with corresponding imports in `index.ts`, `help.ts`, and `man.ts`.
- TypeScript compilation verified with `npx tsc --noEmit` (clean).