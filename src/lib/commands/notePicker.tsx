// src/lib/commands/notePicker.tsx
// Searchable note explorer used when attaching a note to a task. Browse the
// /notes-app tree or type to fuzzy-search across all notes; pick a file to
// attach it to the task that opened the picker.
import { useEffect, useMemo, useState } from 'react'
import { useTerminalStore } from '../terminalStore'
import { NOTES_DIR, noteFileName, taskNotePath } from '../tasks'

type Item =
  | { kind: 'up' }
  | { kind: 'dir'; name: string; path: string }
  | { kind: 'file'; name: string; path: string; rel: string }
  | { kind: 'create'; fileName: string; path: string }

function join(dir: string, name: string): string {
  return dir === '/' ? `/${name}` : `${dir}/${name}`
}

export function NotePickerModal() {
  const open = useTerminalStore((s) => s.notePickerOpen)
  const taskId = useTerminalStore((s) => s.notePickerTaskId)
  const tasks = useTerminalStore((s) => s.tasks)
  const fsVersion = useTerminalStore((s) => s.fsVersion)
  const fileSystem = useTerminalStore((s) => s.fileSystem)
  const applyTaskOp = useTerminalStore((s) => s.applyTaskOp)
  const createNote = useTerminalStore((s) => s.createNote)
  const openEditor = useTerminalStore((s) => s.openEditor)
  const close = useTerminalStore((s) => s.closeNotePicker)

  const [query, setQuery] = useState('')
  const [cwd, setCwd] = useState(NOTES_DIR)
  const [selIdx, setSelIdx] = useState(0)

  useEffect(() => {
    if (open) {
      setQuery('')
      setCwd(NOTES_DIR)
      setSelIdx(0)
    }
  }, [open])

  const q = query.trim().toLowerCase()
  const task = tasks.find((t) => t.id === taskId)

  const items = useMemo<Item[]>(() => {
    void fsVersion
    if (q) {
      const matches: Item[] = []
      for (const p of fileSystem.getAllPaths()) {
        if (!p.startsWith(NOTES_DIR + '/') || fileSystem.isDirectory(p)) continue
        const rel = p.slice(NOTES_DIR.length + 1)
        if (rel.toLowerCase().includes(q)) {
          matches.push({ kind: 'file', name: p.split('/').pop() || p, path: p, rel })
        }
      }
      const result = matches.slice(0, 100)
      const fileName = noteFileName(query)
      if (fileName && task) {
        result.push({ kind: 'create', fileName, path: taskNotePath(task.title, fileName) })
      }
      return result
    }

    const list: Item[] = []
    if (cwd !== NOTES_DIR) list.push({ kind: 'up' })
    try {
      const names = fileSystem
        .listDirectory(cwd)
        .map((n) => ({ name: n, path: join(cwd, n), isDir: fileSystem.isDirectory(join(cwd, n)) }))
        .sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1))
      for (const e of names) {
        if (e.isDir) list.push({ kind: 'dir', name: e.name, path: e.path })
        else list.push({ kind: 'file', name: e.name, path: e.path, rel: e.path.slice(NOTES_DIR.length + 1) })
      }
    } catch {
      /* directory vanished */
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, query, cwd, fileSystem, fsVersion, task])

  const sIdx = items.length ? Math.min(selIdx, items.length - 1) : 0
  const selected = items[sIdx]

  function activate(item: Item | undefined) {
    if (!item) return
    if (item.kind === 'up') {
      setCwd(fileSystem.getParent(cwd))
      setSelIdx(0)
    } else if (item.kind === 'dir') {
      setCwd(item.path)
      setSelIdx(0)
    } else if (item.kind === 'create') {
      const r = createNote(item.path)
      if (!r.ok) return
      if (taskId !== null) applyTaskOp({ kind: 'attach', id: taskId, path: item.path })
      let content = ''
      try {
        content = fileSystem.readFile(item.path)
      } catch {
        /* freshly created, empty */
      }
      close()
      openEditor(item.path, content)
    } else {
      if (taskId !== null) applyTaskOp({ kind: 'attach', id: taskId, path: item.path })
      close()
    }
  }

  if (!open) return null

  const border = 'color-mix(in srgb, var(--color-terminal-green) 30%, transparent)'
  const breadcrumb = q ? `searching ${NOTES_DIR}` : cwd

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={() => close()}
    >
      <div
        className="flex flex-col w-[90vw] h-[70vh] max-w-2xl bg-terminal-bg border-2 rounded-lg overflow-hidden"
        style={{
          borderColor: border,
          boxShadow: '0 0 30px color-mix(in srgb, var(--color-terminal-green) 15%, transparent)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b bg-terminal-bg"
          style={{ borderBottomColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
        >
          <span className="text-terminal-green font-bold terminal-glow">
            ATTACH NOTE{taskId !== null ? ` → #${taskId}` : ''}
          </span>
          <span className="text-terminal-green-dark text-xs font-mono">{breadcrumb}</span>
        </div>

        {/* Search box */}
        <div
          className="px-4 py-2 border-b bg-terminal-bg font-mono text-sm flex items-center gap-2"
          style={{ borderBottomColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
        >
          <span className="text-terminal-green-dark">/</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelIdx(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelIdx((i) => Math.min(i + 1, items.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelIdx((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                activate(selected)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                close()
              } else if (e.key === 'Backspace' && query === '' && cwd !== NOTES_DIR) {
                e.preventDefault()
                setCwd(fileSystem.getParent(cwd))
                setSelIdx(0)
              }
            }}
            placeholder="search notes… (↑↓ navigate, enter select, esc cancel)"
            className="flex-1 bg-terminal-bg text-terminal-green outline-none placeholder:text-terminal-green-dark/60"
            spellCheck={false}
            autoComplete="off"
            style={{ caretColor: 'var(--color-terminal-green)' }}
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 terminal-scrollbar font-mono text-sm">
          {items.length === 0 ? (
            <div className="px-2 py-3 text-terminal-green-dark italic">
              {q ? 'No matching notes.' : 'This folder has no notes.'}
            </div>
          ) : (
            items.map((item, i) => {
              const active = i === sIdx
              const cls = `px-2 py-1 rounded flex items-center gap-2 cursor-pointer ${active ? 'bg-terminal-green/15' : ''}`
              if (item.kind === 'up') {
                return (
                  <div key="__up" className={cls} onClick={() => activate(item)}>
                    <span className="text-terminal-green-dark">↑</span>
                    <span className="text-terminal-green-dark">../</span>
                  </div>
                )
              }
              if (item.kind === 'dir') {
                return (
                  <div key={item.path} className={cls} onClick={() => activate(item)}>
                    <span className="text-terminal-cyan">▸</span>
                    <span className="text-terminal-cyan">{item.name}/</span>
                  </div>
                )
              }
              if (item.kind === 'create') {
                const dir = item.path.slice(0, item.path.length - item.fileName.length - 1)
                return (
                  <div key="__create" className={cls} onClick={() => activate(item)}>
                    <span className="text-terminal-magenta">＋</span>
                    <span className="text-terminal-magenta truncate">
                      Create &ldquo;{item.fileName}&rdquo;{' '}
                      <span className="text-terminal-green-dark">in {dir}</span>
                    </span>
                  </div>
                )
              }
              return (
                <div key={item.path} className={cls} onClick={() => activate(item)}>
                  <span className="text-terminal-yellow">•</span>
                  <span className="text-terminal-green truncate">{q ? item.rel : item.name}</span>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t bg-terminal-bg text-terminal-green-dark text-xs font-mono"
          style={{ borderTopColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
        >
          <span>
            <b className="text-terminal-green">↑↓</b> nav · <b className="text-terminal-green">enter</b> {selected?.kind === 'dir' ? 'open folder' : selected?.kind === 'up' ? 'go up' : selected?.kind === 'create' ? 'create & edit' : 'attach'} · <b className="text-terminal-green">⌫</b> up · <b className="text-terminal-green">esc</b> cancel
          </span>
          <span>{items.length} item(s)</span>
        </div>
      </div>
    </div>
  )
}
