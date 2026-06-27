# Implementation Plan: Text Editor Modal (P004)

**Goal:** Add a cyberpunk-styled modal text editor that opens via the `edit <file>` command, allowing users to edit any file in the in-memory file system.

**Architecture:** The `edit` command returns a special result that signals the terminal store to open the editor modal. The modal is a React component overlay with a textarea, file path header, and shortcut footer. File writes go through a new `writeFile` method on the `FileSystem` class. Keyboard shortcuts (Ctrl+S, Escape) are handled within the modal.

**Tech Stack:** React, Zustand, Tailwind CSS, TypeScript

---

## Global Constraints

- Follow existing cyberpunk color tokens (`--color-terminal-green`, `--color-terminal-bg`, etc.)
- No external editor libraries — pure React textarea
- Keep changes minimal; don't refactor unrelated code
- Editor must work with the existing in-memory `FileSystem` (no persistence)
- Keyboard shortcuts: `Ctrl+S` = Save, `Esc` = Quit without saving

---

## Task 1: Add `writeFile` to FileSystem

**Files:**
- Modify: `src/lib/fileSystem.ts`
- Test: Manual — `edit` command in terminal

**Interfaces:**
- Consumes: Existing `FileSystem` class structure
- Produces: `writeFile(path: string, content: string): void` method

- [ ] **Step 1: Add `writeFile` method**

In `src/lib/fileSystem.ts`, after the `readFile` method, add:

```typescript
  writeFile(path: string, content: string): void {
    const normalized = this.resolvePath(path)
    const entry = this.getEntry(normalized)

    if (!entry) throw new Error(`edit: ${path}: No such file or directory`)
    if (entry.type === 'directory') throw new Error(`edit: ${path}: Is a directory`)

    this.entries.set(normalized, { type: 'file', content })
  }
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 2: Add `edit` command to command registry

**Files:**
- Modify: `src/lib/commands.ts`
- Test: Manual — `edit` command in terminal

**Interfaces:**
- Consumes: `FileSystem.readFile()`, `FileSystem.writeFile()` (Task 1)
- Produces: `edit` command handler; special `CommandResult` with `openEditor: true`

- [ ] **Step 1: Extend `CommandResult` type**

In `src/lib/commands.ts`, modify the `CommandResult` type:

```typescript
export type CommandResult = {
  success: boolean
  error?: string
  data?: {
    output?: string
    newPath?: string
    openEditor?: boolean
    editorFilePath?: string
    editorContent?: string
  }
}
```

- [ ] **Step 2: Add `edit` command handler**

Add the `edit` handler to the `commands` object, before the closing brace:

```typescript
  edit: (args, context) => {
    if (args.length === 0) {
      return { success: false, error: 'edit: missing file operand' }
    }

    try {
      const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
      const content = context.fileSystem.readFile(resolved)
      return {
        success: true,
        data: {
          openEditor: true,
          editorFilePath: resolved,
          editorContent: content,
        },
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },
```

- [ ] **Step 3: Update `help` command**

Modify the `help` command output array to include:

```typescript
'  edit <file>     Open file in text editor',
```

Place it after `touch` and before `rm`.

- [ ] **Step 4: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 3: Extend terminal store with editor state

**Files:**
- Modify: `src/lib/terminalStore.ts`
- Test: Manual — `edit` command opens editor

**Interfaces:**
- Consumes: `CommandResult.data.openEditor` (Task 2)
- Produces: `editorOpen: boolean`, `editorFilePath: string | null`, `editorContent: string | null`, `openEditor(filePath, content)`, `closeEditor()`, `saveEditor(content)` store actions

- [ ] **Step 1: Add editor state to `TerminalState` type**

In `src/lib/terminalStore.ts`, add these fields to `TerminalState`:

```typescript
  editorOpen: boolean
  editorFilePath: string | null
  editorContent: string | null
  openEditor: (filePath: string, content: string) => void
  closeEditor: () => void
  saveEditor: (content: string) => void
```

- [ ] **Step 2: Add initial state**

In the `create<TerminalState>` call, add initial values:

```typescript
  editorOpen: false,
  editorFilePath: null,
  editorContent: null,
```

- [ ] **Step 3: Modify `executeCommand` to handle `edit`**

In the `executeCommand` method, after the `cd` handling block and before the output block, add:

```typescript
    if (command === 'edit' && result.success && result.data?.openEditor) {
      set({
        editorOpen: true,
        editorFilePath: result.data.editorFilePath || null,
        editorContent: result.data.editorContent || '',
      })
      return
    }
```

This prevents the normal prompt/output flow when the editor opens.

- [ ] **Step 4: Add editor actions**

Add these actions to the store object:

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

- [ ] **Step 5: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 4: Create EditorModal component

**Files:**
- Create: `src/components/EditorModal.tsx`
- Test: Manual — render and keyboard shortcuts

**Interfaces:**
- Consumes: `editorFilePath`, `editorContent`, `saveEditor(content)`, `closeEditor()` from store (Task 3)
- Produces: `EditorModal` React component

- [ ] **Step 1: Create the component**

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
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-green-dark/30 bg-terminal-bg">
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
          style={{ caretColor: '#00ff00', lineHeight: '1.6' }}
        />

        {/* Footer with shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-terminal-green-dark/30 bg-terminal-bg text-terminal-green-dark text-xs font-mono">
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

- [ ] **Step 2: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 5: Integrate EditorModal into Terminal

**Files:**
- Modify: `src/components/Terminal.tsx`
- Test: Manual — `edit` command opens modal, Escape/Ctrl+S work

**Interfaces:**
- Consumes: `EditorModal` component (Task 4), `editorOpen` from store (Task 3)
- Produces: Updated `Terminal` component

- [ ] **Step 1: Import and render EditorModal**

In `src/components/Terminal.tsx`, add the import:

```typescript
import { EditorModal } from './EditorModal'
```

And inside the component's return JSX, add `<EditorModal />` just before the scanlines overlay:

```tsx
      </div>
      <EditorModal />
      {/* Scanlines overlay */}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 6: Manual Verification

**Files:** None
**Test:** Manual browser testing

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts at `http://localhost:3000`

- [ ] **Step 2: Test `edit` on existing file**

In the terminal, type:
```
edit /home/user/welcome.txt
```
Expected: Modal opens with content `Welcome to the Terminal Simulator!...`

- [ ] **Step 3: Test editing and saving**

Add some text, press `Ctrl+S`.
Expected: Modal closes, terminal shows `Saved /home/user/welcome.txt`, prompt returns.
Type:
```
cat /home/user/welcome.txt
```
Expected: Shows the updated content.

- [ ] **Step 4: Test quit without saving**

Type:
```
edit /home/user/welcome.txt
```
Make changes, press `Escape`.
Expected: Modal closes, prompt returns. `cat` shows original content (no save).

- [ ] **Step 5: Test error case**

Type:
```
edit /nonexistent/file.txt
```
Expected: Red error: `cat: /nonexistent/file.txt: No such file or directory`

- [ ] **Step 6: Test `help` includes `edit`**

Type:
```
help
```
Expected: `edit <file>` appears in the command list.

---

## Files Modified

| File | Tasks | Changes |
|------|-------|---------|
| `src/lib/fileSystem.ts` | 1 | Add `writeFile()` method |
| `src/lib/commands.ts` | 2 | Extend `CommandResult`, add `edit` handler, update `help` |
| `src/lib/terminalStore.ts` | 3 | Add editor state and actions to Zustand store |
| `src/components/EditorModal.tsx` | 4 | Create modal overlay component |
| `src/components/Terminal.tsx` | 5 | Render `<EditorModal />` |
