import { CommandHandler, CommandEffect } from './types'
import type { FileSystem } from '../fileSystem'
import type { TaskOp, TaskStatus } from '../tasks'
import {
  NOTES_DIR,
  TASK_STATUSES,
  STATUS_GLYPH,
  findTask,
  isValidDueDate,
  renderTaskList,
} from '../tasks'

export const MANUAL = `tasks

Manage tasks and notes from the terminal.

Notes are plain files under ${NOTES_DIR} (use mkdir/edit/cat/ls/md).
Tasks are records with a title, status, optional due date and attached notes.

Usage:
  tasks                       Open the interactive board
  tasks ls [--status S]       List tasks (S = todo|doing|blocked|done)
  tasks add "title" [--due YYYY-MM-DD]
  tasks done <id>             Mark a task done
  tasks status <id> <state>   Set status (todo|doing|blocked|done)
  tasks edit <id> [--title "..."] [--due YYYY-MM-DD|none]
  tasks attach <id> <path>    Attach a note (path under ${NOTES_DIR})
  tasks detach <id> <path>    Detach a note
  tasks notes <id>            List a task's attached notes
  tasks rm <id>               Delete a task`

export const HELP_TEXT = '  tasks                 Manage tasks & notes (board + subcommands)'

// ─── Arg parsing (re-tokenize: the shell splitter strips quoting) ────────────

export function tokenize(input: string): string[] {
  const tokens: string[] = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(input))) {
    tokens.push(m[1] ?? m[2] ?? m[3])
  }
  return tokens
}

function extractFlag(tokens: string[], name: string): { value?: string; rest: string[] } {
  const i = tokens.indexOf(`--${name}`)
  if (i === -1) return { rest: tokens }
  return { value: tokens[i + 1], rest: [...tokens.slice(0, i), ...tokens.slice(i + 2)] }
}

function parseId(token: string | undefined): number | null {
  if (!token) return null
  const n = parseInt(token.replace(/^#/, ''), 10)
  return Number.isInteger(n) ? n : null
}

export type TitleDue = { title: string; due?: string; clearDue?: boolean; error?: string }

export function parseTitleDue(value: string): TitleDue {
  const tokens = tokenize(value)
  const due = extractFlag(tokens, 'due')
  const titleFlag = extractFlag(due.rest, 'title')
  const title = (titleFlag.value ?? titleFlag.rest.join(' ')).trim()

  if (due.value === undefined) return { title }
  if (due.value === 'none') return { title, clearDue: true }
  if (!isValidDueDate(due.value)) {
    return { title, error: `invalid date: ${due.value} (use YYYY-MM-DD)` }
  }
  return { title, due: due.value }
}

// Resolve a user-supplied note path, constrained to the notes directory.
export function resolveNotePath(
  fs: FileSystem,
  raw: string
): { path: string } | { error: string } {
  const resolved = raw.startsWith('/')
    ? fs.resolvePath(raw, '/')
    : fs.resolvePath(raw, NOTES_DIR)
  if (resolved !== NOTES_DIR && !resolved.startsWith(NOTES_DIR + '/')) {
    return { error: `notes must live under ${NOTES_DIR}` }
  }
  return { path: resolved }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export const handler: CommandHandler = (args, context) => {
  const tokens = tokenize(args.join(' '))
  const sub = tokens[0]

  // Bare `tasks` opens the interactive board.
  if (!sub) {
    return { success: true, data: { openTasksModal: true } }
  }

  const rest = tokens.slice(1)
  const fail = (msg: string): ReturnType<CommandHandler> => ({ success: false, error: `tasks: ${msg}` })
  const op = (taskOp: TaskOp): ReturnType<CommandHandler> => ({ success: true, data: { taskOp } })

  switch (sub) {
    case 'ls': {
      const { value: statusFilter } = extractFlag(rest, 'status')
      let tasks = context.tasks
      if (statusFilter) {
        if (!TASK_STATUSES.includes(statusFilter as TaskStatus)) {
          return fail(`invalid status: ${statusFilter}`)
        }
        tasks = tasks.filter((t) => t.status === statusFilter)
      }
      return { success: true, data: { output: renderTaskList(tasks) } }
    }

    case 'add': {
      const parsed = parseTitleDue(rest.join(' '))
      if (parsed.error) return fail(parsed.error)
      if (!parsed.title) return fail('add: missing title')
      return op({ kind: 'add', title: parsed.title, dueDate: parsed.due })
    }

    case 'done': {
      const id = parseId(rest[0])
      if (id === null) return fail('done: expected a task id')
      if (!findTask(context.tasks, id)) return fail(`no such task #${id}`)
      return op({ kind: 'status', id, status: 'done' })
    }

    case 'status': {
      const id = parseId(rest[0])
      if (id === null) return fail('status: expected a task id')
      if (!findTask(context.tasks, id)) return fail(`no such task #${id}`)
      const status = rest[1] as TaskStatus
      if (!TASK_STATUSES.includes(status)) {
        return fail(`invalid status: ${rest[1] ?? '(none)'} (todo|doing|blocked|done)`)
      }
      return op({ kind: 'status', id, status })
    }

    case 'edit': {
      const id = parseId(rest[0])
      if (id === null) return fail('edit: expected a task id')
      if (!findTask(context.tasks, id)) return fail(`no such task #${id}`)
      const parsed = parseTitleDue(rest.slice(1).join(' '))
      if (parsed.error) return fail(parsed.error)
      if (!parsed.title && parsed.due === undefined && !parsed.clearDue) {
        return fail('edit: nothing to change (--title and/or --due)')
      }
      return op({
        kind: 'edit',
        id,
        title: parsed.title || undefined,
        dueDate: parsed.clearDue ? null : parsed.due,
      })
    }

    case 'attach': {
      const id = parseId(rest[0])
      if (id === null) return fail('attach: expected a task id')
      if (!findTask(context.tasks, id)) return fail(`no such task #${id}`)
      if (!rest[1]) return fail('attach: missing note path')
      const r = resolveNotePath(context.fileSystem, rest[1])
      if ('error' in r) return fail(r.error)
      const entry = context.fileSystem.getEntry(r.path)
      if (!entry) return fail(`${rest[1]}: no such note`)
      if (entry.type === 'directory') return fail(`${rest[1]}: is a directory`)
      return op({ kind: 'attach', id, path: r.path })
    }

    case 'detach': {
      const id = parseId(rest[0])
      if (id === null) return fail('detach: expected a task id')
      if (!findTask(context.tasks, id)) return fail(`no such task #${id}`)
      if (!rest[1]) return fail('detach: missing note path')
      const r = resolveNotePath(context.fileSystem, rest[1])
      if ('error' in r) return fail(r.error)
      return op({ kind: 'detach', id, path: r.path })
    }

    case 'notes': {
      const id = parseId(rest[0])
      if (id === null) return fail('notes: expected a task id')
      const task = findTask(context.tasks, id)
      if (!task) return fail(`no such task #${id}`)
      if (task.notePaths.length === 0) {
        return { success: true, data: { output: `#${id} has no attached notes.` } }
      }
      const lines = task.notePaths.map((p) => {
        const exists = context.fileSystem.exists(p)
        return `  ${exists ? '•' : '✗'} ${p}${exists ? '' : '   (missing)'}`
      })
      return { success: true, data: { output: [`Notes for #${id}:`, ...lines].join('\n') } }
    }

    case 'rm': {
      const id = parseId(rest[0])
      if (id === null) return fail('rm: expected a task id')
      if (!findTask(context.tasks, id)) return fail(`no such task #${id}`)
      return op({ kind: 'rm', id })
    }

    default:
      return fail(`unknown subcommand '${sub}' (try: ls, add, done, status, edit, attach, detach, notes, rm)`)
  }
}

export const effect: CommandEffect = (result, context) => {
  if (!result.success) return 'continue'
  if (result.data?.openTasksModal) {
    context.openTasks()
    return 'handled'
  }
  if (result.data?.taskOp) {
    const message = context.applyTaskOp(result.data.taskOp)
    context.addLine('output', message)
    return 'handled'
  }
  return 'continue'
}

// ─── Interactive board (TasksModal) ──────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useTerminalStore } from '../terminalStore'
import { isOverdue, nextStatus, sortedTasks, noteFileName, taskNotePath, slugifyTitle } from '../tasks'

type Mode = null | 'add' | 'edit' | 'confirm' | 'newnote'

export function TasksModal() {
  const tasksOpen = useTerminalStore((s) => s.tasksOpen)
  const markdownOpen = useTerminalStore((s) => s.markdownOpen)
  const editorOpen = useTerminalStore((s) => s.editorOpen)
  const notePickerOpen = useTerminalStore((s) => s.notePickerOpen)
  const tasks = useTerminalStore((s) => s.tasks)
  const fileSystem = useTerminalStore((s) => s.fileSystem)
  const applyTaskOp = useTerminalStore((s) => s.applyTaskOp)
  const closeTasks = useTerminalStore((s) => s.closeTasks)
  const openTaskNote = useTerminalStore((s) => s.openTaskNote)
  const openNotePicker = useTerminalStore((s) => s.openNotePicker)
  const createNote = useTerminalStore((s) => s.createNote)
  const openEditor = useTerminalStore((s) => s.openEditor)

  const [pane, setPane] = useState<'tasks' | 'notes'>('tasks')
  const [taskIdx, setTaskIdx] = useState(0)
  const [noteIdx, setNoteIdx] = useState(0)
  const [mode, setMode] = useState<Mode>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const ordered = sortedTasks(tasks)
  const tIdx = ordered.length ? Math.min(taskIdx, ordered.length - 1) : 0
  const selected = ordered[tIdx]
  const notes = selected?.notePaths ?? []
  const nIdx = notes.length ? Math.min(noteIdx, notes.length - 1) : 0

  // Reset transient UI whenever the board is (re)opened.
  useEffect(() => {
    if (tasksOpen) {
      setPane('tasks')
      setTaskIdx(0)
      setNoteIdx(0)
      setMode(null)
      setInput('')
      setError('')
    }
  }, [tasksOpen])

  const isTextMode = mode === 'add' || mode === 'edit' || mode === 'newnote'

  function startEdit() {
    if (!selected) return
    const due = selected.dueDate ? ` --due ${selected.dueDate}` : ''
    setInput(`${selected.title}${due}`)
    setError('')
    setMode('edit')
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

  // Global key handling (navigation + shortcuts), disabled while typing or when
  // a note is open on top of the board.
  useEffect(() => {
    if (!tasksOpen || markdownOpen || notePickerOpen || editorOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (isTextMode) return // the input element owns these keys

      if (mode === 'confirm') {
        e.preventDefault()
        if ((e.key === 'y' || e.key === 'Enter') && selected) {
          applyTaskOp({ kind: 'rm', id: selected.id })
        }
        setMode(null)
        return
      }

      const key = e.key
      if (key === 'Escape') {
        e.preventDefault()
        if (pane === 'notes') setPane('tasks')
        else closeTasks()
        return
      }
      if (key === 'ArrowDown' || key === 'j') {
        e.preventDefault()
        if (pane === 'tasks') setTaskIdx((i) => Math.min(i + 1, ordered.length - 1))
        else setNoteIdx((i) => Math.min(i + 1, notes.length - 1))
        return
      }
      if (key === 'ArrowUp' || key === 'k') {
        e.preventDefault()
        if (pane === 'tasks') setTaskIdx((i) => Math.max(i - 1, 0))
        else setNoteIdx((i) => Math.max(i - 1, 0))
        return
      }

      if (pane === 'tasks') {
        if (!selected) {
          if (key === 'a') {
            e.preventDefault()
            setInput('')
            setError('')
            setMode('add')
          }
          return
        }
        if (key === 'Tab' || key === 'ArrowRight' || key === 'Enter') {
          e.preventDefault()
          if (notes.length) {
            setNoteIdx(0)
            setPane('notes')
          }
          return
        }
        if (key === ' ') {
          e.preventDefault()
          applyTaskOp({ kind: 'status', id: selected.id, status: nextStatus(selected.status) })
          return
        }
        if (key === 'x') {
          e.preventDefault()
          applyTaskOp({
            kind: 'status',
            id: selected.id,
            status: selected.status === 'done' ? 'todo' : 'done',
          })
          return
        }
        if (key === 'a') {
          e.preventDefault()
          setInput('')
          setError('')
          setMode('add')
          return
        }
        if (key === 'e') {
          e.preventDefault()
          startEdit()
          return
        }
        if (key === 'n') {
          e.preventDefault()
          openNotePicker(selected.id)
          return
        }
        if (key === 'c') {
          e.preventDefault()
          setInput('')
          setError('')
          setMode('newnote')
          return
        }
        if (key === 'd') {
          e.preventDefault()
          setMode('confirm')
          return
        }
      } else {
        // notes pane
        if (key === 'Tab' || key === 'ArrowLeft') {
          e.preventDefault()
          setPane('tasks')
          return
        }
        if (key === 'Enter') {
          e.preventDefault()
          if (notes[nIdx]) openTaskNote(notes[nIdx])
          return
        }
        if (key === 'd') {
          e.preventDefault()
          if (selected && notes[nIdx]) {
            applyTaskOp({ kind: 'detach', id: selected.id, path: notes[nIdx] })
            setNoteIdx((i) => Math.max(0, i - 1))
          }
          return
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [
    tasksOpen,
    markdownOpen,
    notePickerOpen,
    editorOpen,
    mode,
    isTextMode,
    pane,
    selected,
    ordered.length,
    notes,
    nIdx,
    applyTaskOp,
    closeTasks,
    openTaskNote,
    openNotePicker,
  ])

  if (!tasksOpen) return null

  const border = 'color-mix(in srgb, var(--color-terminal-green) 30%, transparent)'

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={() => closeTasks()}
    >
      <div
        className="flex flex-col w-[90vw] h-[85vh] max-w-5xl bg-terminal-bg border-2 rounded-lg overflow-hidden"
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
          <span className="text-terminal-green font-bold terminal-glow">TASKS</span>
          <span className="text-terminal-green-dark text-xs font-mono">
            {ordered.length} task(s) · notes in {NOTES_DIR}
          </span>
        </div>

        {/* Body: task list | detail */}
        <div className="flex-1 flex min-h-0">
          {/* Task list */}
          <div className="w-1/2 overflow-y-auto p-2 terminal-scrollbar font-mono text-sm border-r"
            style={{ borderRightColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
          >
            {ordered.length === 0 && (
              <div className="text-terminal-green-dark p-3">
                No tasks yet. Press <span className="text-terminal-green font-bold">a</span> to add one.
              </div>
            )}
            {ordered.map((t, i) => {
              const active = pane === 'tasks' && i === tIdx
              const overdue = isOverdue(t)
              return (
                <div
                  key={t.id}
                  className={`px-2 py-1 rounded flex items-center gap-2 ${active ? 'bg-terminal-green/15' : ''}`}
                >
                  <span className="text-terminal-green-dark w-8 shrink-0">#{t.id}</span>
                  <span className="text-terminal-cyan shrink-0">{STATUS_GLYPH[t.status]}</span>
                  <span
                    className={`flex-1 truncate ${t.status === 'done' ? 'text-terminal-green-dark line-through' : 'text-terminal-green'}`}
                  >
                    {t.title}
                  </span>
                  {t.dueDate && (
                    <span className={`text-xs shrink-0 ${overdue ? 'text-terminal-red font-bold' : 'text-terminal-green-dark'}`}>
                      {overdue ? '!OVERDUE ' : ''}{t.dueDate}
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
          <div className="w-1/2 overflow-y-auto p-4 terminal-scrollbar font-mono text-sm">
            {selected ? (
              <>
                <div className="text-terminal-green font-bold mb-1">
                  #{selected.id} {selected.title}
                </div>
                <div className="text-terminal-green-dark mb-1">
                  status: <span className="text-terminal-cyan">{selected.status}</span>
                </div>
                <div className="text-terminal-green-dark mb-3">
                  due:{' '}
                  {selected.dueDate ? (
                    <span className={isOverdue(selected) ? 'text-terminal-red font-bold' : 'text-terminal-green'}>
                      {selected.dueDate}{isOverdue(selected) ? '  !OVERDUE' : ''}
                    </span>
                  ) : (
                    <span className="text-terminal-green-dark">none</span>
                  )}
                </div>
                <div className="text-terminal-green-dark mb-1">
                  notes {pane === 'notes' && <span className="text-terminal-cyan">[focused — ↑↓, Enter open, d detach]</span>}
                </div>
                {notes.length === 0 ? (
                  <div className="text-terminal-green-dark italic">none — press n to attach</div>
                ) : (
                  notes.map((p, i) => {
                    const exists = fileSystem.exists(p)
                    const active = pane === 'notes' && i === nIdx
                    return (
                      <div
                        key={p}
                        className={`px-2 py-0.5 rounded truncate ${active ? 'bg-terminal-green/15' : ''} ${exists ? 'text-terminal-green' : 'text-terminal-red'}`}
                      >
                        {exists ? '•' : '✗'} {p.replace(NOTES_DIR + '/', '')}{exists ? '' : ' (missing)'}
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

        {/* Input row (add / edit / attach) */}
        {isTextMode && (
          <div
            className="px-4 py-2 border-t bg-terminal-bg font-mono text-sm"
            style={{ borderTopColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
          >
            <label className="text-terminal-green-dark mr-2">
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
              className="bg-terminal-bg text-terminal-green outline-none border-b border-terminal-green/40 w-2/3"
              spellCheck={false}
              autoComplete="off"
              style={{ caretColor: 'var(--color-terminal-green)' }}
            />
            {error && <span className="text-terminal-red ml-3">{error}</span>}
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t bg-terminal-bg text-terminal-green-dark text-xs font-mono"
          style={{ borderTopColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
        >
          {mode === 'confirm' ? (
            <span className="text-terminal-red">
              Delete #{selected?.id}? <span className="text-terminal-green font-bold">[y]</span> yes · any other key cancels
            </span>
          ) : pane === 'tasks' ? (
            <span>
              <b className="text-terminal-green">↑↓</b> nav · <b className="text-terminal-green">space</b> status · <b className="text-terminal-green">x</b> done · <b className="text-terminal-green">a</b> add · <b className="text-terminal-green">e</b> edit · <b className="text-terminal-green">c</b> new note · <b className="text-terminal-green">n</b> attach · <b className="text-terminal-green">d</b> del · <b className="text-terminal-green">→</b> notes · <b className="text-terminal-green">esc</b> close
            </span>
          ) : (
            <span>
              <b className="text-terminal-green">↑↓</b> nav · <b className="text-terminal-green">enter</b> open · <b className="text-terminal-green">d</b> detach · <b className="text-terminal-green">←</b> back
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
