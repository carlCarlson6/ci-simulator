// src/components/desktop/apps/TasksApp.tsx
// Mouse-driven task board over the same task state the `tasks` command uses.
// Clicking a status glyph cycles it; the detail pane edits, attaches notes
// (via the shared NotePickerModal) and deletes.
import { useState } from 'react'
import { useTerminalStore } from '../../../lib/terminalStore'
import {
  NOTES_DIR,
  STATUS_GLYPH,
  TASK_STATUSES,
  isOverdue,
  nextStatus,
  noteFileName,
  slugifyTitle,
  sortedTasks,
  taskNotePath,
} from '../../../lib/tasks'
import { parseTitleDue } from '../../../lib/commands/tasks'

type Mode = null | 'add' | 'edit' | 'newnote'

export function TasksApp() {
  const tasks = useTerminalStore((s) => s.tasks)
  const fileSystem = useTerminalStore((s) => s.fileSystem)
  const applyTaskOp = useTerminalStore((s) => s.applyTaskOp)
  const openTaskNote = useTerminalStore((s) => s.openTaskNote)
  const openNotePicker = useTerminalStore((s) => s.openNotePicker)
  const createNote = useTerminalStore((s) => s.createNote)
  const openEditor = useTerminalStore((s) => s.openEditor)

  const [selId, setSelId] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  const ordered = sortedTasks(tasks)
  const selected = ordered.find((t) => t.id === selId) ?? ordered[0] ?? null
  const notes = selected?.notePaths ?? []

  function startAdd() {
    setMode('add')
    setInput('')
    setError('')
  }

  function startEdit() {
    if (!selected) return
    const due = selected.dueDate ? ` --due ${selected.dueDate}` : ''
    setMode('edit')
    setInput(`${selected.title}${due}`)
    setError('')
  }

  function submitText() {
    setError('')
    if (mode === 'add') {
      const parsed = parseTitleDue(input)
      if (parsed.error) return setError(parsed.error)
      if (!parsed.title) return setError('title required')
      applyTaskOp({ kind: 'add', title: parsed.title, dueDate: parsed.due })
    } else if (mode === 'edit' && selected) {
      const parsed = parseTitleDue(input)
      if (parsed.error) return setError(parsed.error)
      applyTaskOp({
        kind: 'edit',
        id: selected.id,
        title: parsed.title || undefined,
        dueDate: parsed.clearDue ? null : parsed.due,
      })
    } else if (mode === 'newnote' && selected) {
      const fileName = noteFileName(input)
      if (!fileName) return setError('note name required')
      const path = taskNotePath(selected.title, fileName)
      const r = createNote(path)
      if (!r.ok) return setError(r.message)
      applyTaskOp({ kind: 'attach', id: selected.id, path })
      setMode(null)
      setInput('')
      openEditor(path, '')
      return
    }
    setMode(null)
    setInput('')
  }

  function deleteSelected() {
    if (!selected) return
    applyTaskOp({ kind: 'rm', id: selected.id })
    setSelId(null)
    setConfirming(false)
  }

  const border = 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)'

  return (
    <div className="flex flex-col h-full bg-terminal-bg font-mono text-sm">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b" style={{ borderBottomColor: border }}>
        <ToolButton onClick={startAdd}>+ task</ToolButton>
        <span className="flex-1 text-terminal-green-dark text-xs">
          {ordered.length} task(s) · notes in {NOTES_DIR}
        </span>
      </div>

      {/* Body: list | detail */}
      <div className="flex flex-1 min-h-0">
        {/* Task list */}
        <div className="w-1/2 overflow-y-auto p-2 terminal-scrollbar border-r" style={{ borderRightColor: border }}>
          {ordered.length === 0 && (
            <div className="text-terminal-green-dark p-3">
              No tasks yet. Use <b className="text-terminal-green">+ task</b> to add one.
            </div>
          )}
          {ordered.map((t) => {
            const active = selected?.id === t.id
            const overdue = isOverdue(t)
            return (
              <div
                key={t.id}
                onClick={() => { setSelId(t.id); setConfirming(false) }}
                className={`px-2 py-1 rounded flex items-center gap-2 cursor-pointer ${
                  active ? 'bg-terminal-green/15' : 'hover:bg-terminal-green/5'
                }`}
              >
                <span className="text-terminal-green-dark w-8 shrink-0">#{t.id}</span>
                <button
                  className="text-terminal-cyan shrink-0 cursor-pointer hover:text-terminal-green"
                  title="Cycle status"
                  onClick={(e) => {
                    e.stopPropagation()
                    applyTaskOp({ kind: 'status', id: t.id, status: nextStatus(t.status) })
                  }}
                >
                  {STATUS_GLYPH[t.status]}
                </button>
                <span
                  className={`flex-1 truncate ${
                    t.status === 'done' ? 'text-terminal-green-dark line-through' : 'text-terminal-green'
                  }`}
                >
                  {t.title}
                </span>
                {t.dueDate && (
                  <span
                    className={`text-xs shrink-0 ${
                      overdue ? 'text-terminal-red font-bold' : 'text-terminal-green-dark'
                    }`}
                  >
                    {overdue ? '!OVERDUE ' : ''}
                    {t.dueDate}
                  </span>
                )}
                {t.notePaths.length > 0 && (
                  <span className="text-terminal-yellow text-xs shrink-0">●{t.notePaths.length}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Detail */}
        <div className="w-1/2 overflow-y-auto p-4 terminal-scrollbar">
          {selected ? (
            <>
              <div className="text-terminal-green font-bold mb-2">
                #{selected.id} {selected.title}
              </div>

              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {TASK_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => applyTaskOp({ kind: 'status', id: selected.id, status: s })}
                    className={`h-6 px-2 rounded border text-xs cursor-pointer ${
                      selected.status === s
                        ? 'bg-terminal-green/15 text-terminal-cyan'
                        : 'text-terminal-green-dark hover:text-terminal-green hover:bg-terminal-green/10'
                    }`}
                    style={{ borderColor: border }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="text-terminal-green-dark mb-3">
                due:{' '}
                {selected.dueDate ? (
                  <span className={isOverdue(selected) ? 'text-terminal-red font-bold' : 'text-terminal-green'}>
                    {selected.dueDate}
                    {isOverdue(selected) ? '  !OVERDUE' : ''}
                  </span>
                ) : (
                  <span>none</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                <ToolButton onClick={startEdit}>edit</ToolButton>
                <ToolButton onClick={() => { setMode('newnote'); setInput(''); setError('') }}>
                  + note
                </ToolButton>
                <ToolButton onClick={() => openNotePicker(selected.id)}>attach</ToolButton>
                {confirming ? (
                  <ToolButton danger onClick={deleteSelected}>
                    confirm?
                  </ToolButton>
                ) : (
                  <ToolButton danger onClick={() => setConfirming(true)}>
                    delete
                  </ToolButton>
                )}
              </div>

              <div className="text-terminal-green-dark mb-1">notes</div>
              {notes.length === 0 ? (
                <div className="text-terminal-green-dark italic">none — use + note or attach</div>
              ) : (
                notes.map((p) => {
                  const exists = fileSystem.exists(p)
                  return (
                    <div key={p} className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-terminal-green/5">
                      <button
                        onClick={() => exists && openTaskNote(p)}
                        className={`flex-1 truncate text-left ${
                          exists ? 'text-terminal-green cursor-pointer hover:underline' : 'text-terminal-red'
                        }`}
                        title={exists ? 'Open note' : 'Note file is missing'}
                      >
                        {exists ? '•' : '✗'} {p.replace(NOTES_DIR + '/', '')}
                        {exists ? '' : ' (missing)'}
                      </button>
                      <button
                        onClick={() => applyTaskOp({ kind: 'detach', id: selected.id, path: p })}
                        className="text-terminal-green-dark hover:text-terminal-red text-xs cursor-pointer shrink-0"
                        title="Detach note"
                      >
                        detach
                      </button>
                    </div>
                  )
                })
              )}
            </>
          ) : (
            <div className="text-terminal-green-dark italic">No task selected.</div>
          )}
        </div>
      </div>

      {/* Input row (add / edit / new note) */}
      {mode !== null && (
        <div className="shrink-0 px-3 py-2 border-t flex items-center gap-2" style={{ borderTopColor: border }}>
          <label className="text-terminal-green-dark shrink-0">
            {mode === 'add' && 'New task (title [--due YYYY-MM-DD]):'}
            {mode === 'edit' && 'Edit (title [--due YYYY-MM-DD|none]):'}
            {mode === 'newnote' && selected && `New note in tasks/${slugifyTitle(selected.title)}/ :`}
          </label>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') {
                e.preventDefault()
                submitText()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                setMode(null)
                setInput('')
                setError('')
              }
            }}
            className="flex-1 bg-terminal-bg text-terminal-green outline-none border-b border-terminal-green/40"
            spellCheck={false}
            autoComplete="off"
            style={{ caretColor: 'var(--color-terminal-green)' }}
          />
        </div>
      )}

      {/* Footer */}
      <div
        className="shrink-0 flex items-center justify-between px-3 py-1.5 border-t text-xs text-terminal-green-dark"
        style={{ borderTopColor: border }}
      >
        <span>{error ? <span className="text-terminal-red">{error}</span> : 'click glyph to cycle status'}</span>
        <span>same data as the `tasks` command</span>
      </div>
    </div>
  )
}

function ToolButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-6 px-2 rounded border text-xs tracking-wide shrink-0 ${
        disabled
          ? 'text-terminal-green-dim opacity-50 cursor-default'
          : danger
            ? 'text-terminal-red hover:bg-terminal-red/15 cursor-pointer'
            : 'text-terminal-green-dark hover:text-terminal-green hover:bg-terminal-green/10 cursor-pointer'
      }`}
      style={{ borderColor: 'color-mix(in srgb, var(--color-terminal-green) 25%, transparent)' }}
    >
      {children}
    </button>
  )
}
