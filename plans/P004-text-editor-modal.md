# Implementation Plan: Text Editor Modal (P004) — Revised ✅ COMPLETE

**Goal:** Add a cyberpunk-styled modal text editor that opens via the `edit <file>` command, allowing users to edit any file in the in-memory file system.

**Status:** All 7 tasks completed. See commit history for implementation details.

**Architecture:** The `edit` command is a first-class modular command (like `cd`, `clear`) with its own handler in `src/lib/commands/edit.ts` and a `CommandEffect` that opens the editor modal via the Zustand store. The modal is a theme-aware React overlay with a textarea, file path header, and shortcut footer. File writes go through a new `writeFile` method on `FileSystem`. Keyboard shortcuts (Ctrl+S, Escape) are handled within the modal.

**Tech Stack:** React, Zustand, Tailwind CSS, TypeScript

---

## Global Constraints

- Follow existing modular command architecture (handler in `src/lib/commands/edit.ts`, effect in same file, registered in `src/lib/commands/index.ts`)
- Use existing cyberpunk color tokens and CSS custom properties (`--color-terminal-green`, etc.) so the modal adapts to the active theme
- No external editor libraries — pure React `<textarea>`
- Keep changes minimal; don't refactor unrelated code
- Editor must work with the existing in-memory `FileSystem` (no persistence)
- Keyboard shortcuts: `Ctrl+S` = Save & Quit, `Esc` = Quit without saving
- `edit` should auto-create missing files (not error)
- Saving must persist filesystem state to `localStorage` immediately

---

## Task 1: Add `writeFile` to FileSystem

**Files:**
- Modify: `src/lib/fileSystem.ts`
- Test: Manual — `edit` command in terminal

**Interfaces:**
- Consumes: Existing `FileSystem` class structure
- Produces: `writeFile(path: string, content: string): void` method

- [x] **Step 1: Add `writeFile` method**

In `src/lib/fileSystem.ts`, after the `readFile` method, add:

```typescript
  writeFile(path: string, content: string): void {
    const normalized = this.resolvePath(path)
    const entry = this.getEntry(normalized)

    if (entry?.type === 'directory') {
      throw new Error(`edit: ${path}: Is a directory`)
    }

    this.entries.set(normalized, { type: 'file', content })
  }
```

- [x] **Step 2: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 2: Extend `CommandResult` and `CommandEffectContext`

**Files:**
- Modify: `src/lib/commands/types.ts`
- Test: `npx tsc --noEmit`

**Interfaces:**
- Consumes: Existing types
- Produces: Updated `CommandResult` with editor fields; updated `CommandEffectContext` with editor actions

- [x] **Step 1: Extend `CommandResult` data**

In `src/lib/commands/types.ts`, add to `CommandResult.data`:

```typescript
    editorFilePath?: string
    editorContent?: string
```

- [x] **Step 2: Extend `CommandEffectContext`**

In `src/lib/commands/types.ts`, add to `CommandEffectContext`:

```typescript
  openEditor: (filePath: string, content: string) => void
  closeEditor: () => void
```

- [x] **Step 3: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 3: Create `edit` command module

**Files:**
- Create: `src/lib/commands/edit.ts`
- Modify: `src/lib/commands/index.ts`
- Modify: `src/lib/commands/help.ts`
- Test: Manual — `edit` command in terminal

**Interfaces:**
- Consumes: `FileSystem.readFile()`, `FileSystem.writeFile()` (Task 1), `CommandEffectContext` (Task 2)
- Produces: `edit` handler + effect, registered in index, listed in help

- [x] **Step 1: Create `src/lib/commands/edit.ts`**

```typescript
import { CommandHandler, CommandEffect } from './types'

export const MANUAL = 'edit\n\nOpen a file in the text editor.\n\nUsage: edit <file>\n  Creates the file if it does not exist.'
export const HELP_TEXT = '  edit <file>           Open file in text editor'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'edit: missing file operand' }
  }

  const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)

  let content = ''
  try {
    content = context.fileSystem.readFile(resolved)
  } catch {
    // File doesn't exist — will be auto-created on save
  }

  return {
    success: true,
    data: {
      editorFilePath: resolved,
      editorContent: content,
    },
  }
}

export const effect: CommandEffect = (result, context) => {
  if (result.success && result.data?.editorFilePath !== undefined) {
    context.openEditor(
      result.data.editorFilePath,
      result.data.editorContent || ''
    )
    return 'handled'
  }
  return 'continue'
}
```

- [x] **Step 2: Register in `src/lib/commands/index.ts`**

Add import:
```typescript
import { handler as editHandler, effect as editEffect } from './edit'
```

Add to `commands` record:
```typescript
  edit: editHandler,
```

Add to `commandEffects` record:
```typescript
  edit: editEffect,
```

- [x] **Step 3: Update `src/lib/commands/help.ts`**

Add import:
```typescript
import { HELP_TEXT as editHelp } from './edit'
```

Add to the output array inside `handler` (after `touchHelp` and before `rmHelp`):
```typescript
      touchHelp,
      editHelp,
      rmHelp,
```

- [x] **Step 4: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 4: Extend terminal store with editor state and actions

**Files:**
- Modify: `src/lib/terminalStore.ts`
- Test: Manual — `edit` command opens editor

**Interfaces:**
- Consumes: `CommandEffectContext.openEditor/closeEditor` (Task 2), `FileSystem.writeFile` (Task 1)
- Produces: `editorOpen`, `editorFilePath`, `editorContent`, `openEditor()`, `closeEditor()`, `saveEditor()` store actions

- [x] **Step 1: Add editor state to `TerminalState` type**

In `src/lib/terminalStore.ts`, add to `TerminalState`:

```typescript
  editorOpen: boolean
  editorFilePath: string | null
  editorContent: string | null
  openEditor: (filePath: string, content: string) => void
  closeEditor: () => void
  saveEditor: (content: string) => void
```

- [x] **Step 2: Add initial state**

In the `create<TerminalState>` call, add:

```typescript
  editorOpen: false,
  editorFilePath: null,
  editorContent: null,
```

- [x] **Step 3: Update `executeCommand` to wire `CommandEffectContext`**

In `executeCommand`, within the `effect` call block, extend the context object:

```typescript
      const outcome = effect(result, {
        fileSystem: state.fileSystem,
        currentPath: state.currentPath,
        previousPath: state.previousPath,
        addLine: (type, content) => get().addLine({ type, content }),
        setPaths: (current, previous) => set({ currentPath: current, previousPath: previous }),
        clearScreen: () => get().clearScreen(),
        saveFileSystem: (fs) => saveFileSystem(fs),
        openEditor: (filePath, content) => get().openEditor(filePath, content),
        closeEditor: () => get().closeEditor(),
      })
```

- [x] **Step 4: Add editor actions to the store**

Add these actions inside the `create<TerminalState>` object:

```typescript
  openEditor: (filePath: string, content: string) => {
    set({
      editorOpen: true,
      editorFilePath: filePath,
      editorContent: content,
    })
  },

  closeEditor: () => {
    set({
      editorOpen: false,
      editorFilePath: null,
      editorContent: null,
    })
    get().addLine({ type: 'prompt', content: get().getPrompt() })
  },

  saveEditor: (content: string) => {
    const state = get()
    if (state.editorFilePath) {
      state.fileSystem.writeFile(state.editorFilePath, content)
      saveFileSystem(state.fileSystem)
    }
    set({
      editorOpen: false,
      editorFilePath: null,
      editorContent: null,
    })
    get().addLine({ type: 'output', content: `Saved ${state.editorFilePath}` })
    get().addLine({ type: 'prompt', content: get().getPrompt() })
  },
```

- [x] **Step 5: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 5: Create `EditorModal` component

**Files:**
- Create: `src/components/EditorModal.tsx`
- Test: Manual — render and keyboard shortcuts

**Interfaces:**
- Consumes: `editorFilePath`, `editorContent`, `saveEditor(content)`, `closeEditor()` from store (Task 4)
- Produces: `EditorModal` React component (theme-aware)

- [x] **Step 1: Create the component**

Create `src/components/EditorModal.tsx` with this content:

```tsx
// src/components/EditorModal.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useTerminalStore } from '../lib/terminalStore'

export function EditorModal() {
  const editorFilePath = useTerminalStore((state) => state.editorFilePath)
  const editorContent = useTerminalStore((state) => state.editorContent)
  const saveEditor = useTerminalStore((state) => state.saveEditor)
  const closeEditor = useTerminalStore((state) => state.closeEditor)

  const [content, setContent] = useState(editorContent || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setContent(editorContent || '')
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [editorContent])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 's' && e.ctrlKey) {
        e.preventDefault()
        saveEditor(content)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        closeEditor()
      }
    },
    [content, saveEditor, closeEditor]
  )

  if (!editorFilePath) return null

  const fileName = editorFilePath.split('/').pop() || editorFilePath

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={() => closeEditor()}
    >
      <div
        className="flex flex-col w-[90vw] h-[85vh] max-w-4xl bg-terminal-bg border-2 border-terminal-green-dark/50 rounded-lg shadow-[0_0_30px_rgba(0,255,0,0.2)] overflow-hidden"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-terminal-green) 30%, transparent)',
          boxShadow: '0 0 30px color-mix(in srgb, var(--color-terminal-green) 15%, transparent)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-terminal-green-dark/30 bg-terminal-bg"
          style={{ borderBottomColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
        >
          <span className="text-terminal-green font-bold terminal-glow">
            EDIT: {fileName}
          </span>
          <span className="text-terminal-green-dark text-xs font-mono">
            {editorFilePath}
          </span>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-terminal-bg text-terminal-green font-mono text-sm p-4 outline-none border-none resize-none terminal-scrollbar terminal-glow"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          style={{ caretColor: 'var(--color-terminal-green)', lineHeight: '1.6' }}
        />

        {/* Footer with shortcuts */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t border-terminal-green-dark/30 bg-terminal-bg text-terminal-green-dark text-xs font-mono"
          style={{ borderTopColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
        >
          <span>
            <span className="text-terminal-green font-bold">[Ctrl+S]</span> Save & Quit
          </span>
          <span>
            <span className="text-terminal-green font-bold">[Esc]</span> Quit without saving
          </span>
        </div>
      </div>
    </div>
  )
}
```

- [x] **Step 2: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 6: Integrate `EditorModal` into `Terminal`

**Files:**
- Modify: `src/components/Terminal.tsx`
- Test: Manual — `edit` command opens modal, Escape/Ctrl+S work

**Interfaces:**
- Consumes: `EditorModal` component (Task 5)
- Produces: Updated `Terminal` component

- [x] **Step 1: Import and render `EditorModal`**

In `src/components/Terminal.tsx`:

Add import:
```typescript
import { EditorModal } from './EditorModal'
```

Add inside the return JSX, just before the scanlines overlay:
```tsx
      <EditorModal />
      {/* Scanlines overlay */}
```

- [x] **Step 2: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 7: Manual Verification

**Files:** None
**Test:** Manual browser testing

- [x] **Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts at `http://localhost:3000`

- [x] **Step 2: Test `edit` on existing file**

In the terminal, type:
```
edit /home/user/welcome.txt
```
Expected: Modal opens with content `Welcome to the Terminal Simulator!...`

- [x] **Step 3: Test editing and saving**

Add some text, press `Ctrl+S`.
Expected: Modal closes, terminal shows `Saved /home/user/welcome.txt`, prompt returns.
Type:
```
cat /home/user/welcome.txt
```
Expected: Shows the updated content.
Refresh page.
Expected: Updated content is still there (persisted to localStorage).

- [x] **Step 4: Test quit without saving**

Type:
```
edit /home/user/welcome.txt
```
Make changes, press `Escape`.
Expected: Modal closes, prompt returns. `cat` shows original content (no save).

- [x] **Step 5: Test auto-create on new file**

Type:
```
edit /home/user/newfile.txt
```
Type some text, press `Ctrl+S`.
Expected: Modal closes, terminal shows `Saved /home/user/newfile.txt`, prompt returns.
Type:
```
cat /home/user/newfile.txt
```
Expected: Shows the new content.

- [x] **Step 6: Test error case**

Type:
```
edit /home/user
```
Expected: Red error: `edit: /home/user: Is a directory`

Type:
```
edit
```
Expected: Red error: `edit: missing file operand`

- [x] **Step 7: Test `help` includes `edit`**

Type:
```
help
```
Expected: `edit <file>` appears in the command list under File System Commands.

- [x] **Step 8: Test theme switching**

Type:
```
theme amber
```
Then:
```
edit /home/user/welcome.txt
```
Expected: Modal borders, caret, glow, and shadows use amber/orange tones, not green.

---

## Files Modified / Created

| File | Tasks | Changes |
|------|-------|---------|
| `src/lib/fileSystem.ts` | 1 | Add `writeFile()` method |
| `src/lib/commands/types.ts` | 2 | Extend `CommandResult.data` and `CommandEffectContext` with editor fields/actions |
| `src/lib/commands/edit.ts` | 3 | Create new command handler + effect |
| `src/lib/commands/index.ts` | 3 | Import & register `edit` handler + effect |
| `src/lib/commands/help.ts` | 3 | Import & list `edit` help text |
| `src/lib/terminalStore.ts` | 4 | Add editor state/actions; wire `openEditor`/`closeEditor` into effect context |
| `src/components/EditorModal.tsx` | 5 | Create theme-aware modal overlay component |
| `src/components/Terminal.tsx` | 6 | Render `<EditorModal />` |
