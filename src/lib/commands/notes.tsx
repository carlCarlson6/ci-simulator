import { CommandHandler, CommandEffect } from './types'
import type { FileSystem } from '../fileSystem'
import { NOTES_DIR } from '../tasks'
import { tokenize, resolveNotePath } from './tasks'

export const MANUAL = `notes

Browse and manage your notes (files under ${NOTES_DIR}).

Usage:
  notes                  Open the notes browser
  notes ls [path]        List notes under ${NOTES_DIR}[/path]
  notes new <path>       Create and open a note in the editor
  notes open <path>      View a note (rendered markdown)
  notes edit <path>      Edit a note in the editor
  notes mkdir <path>     Create a folder
  notes rm <path>        Delete a note or folder

Paths are resolved under ${NOTES_DIR}.`

export const HELP_TEXT = '  notes                 Browse & manage notes (browser + subcommands)'

function renderListing(fs: FileSystem, dir: string): string {
  const names = fs.listDirectory(dir)
  if (names.length === 0) return `${dir} is empty.`
  const rows = names
    .map((n) => {
      const full = dir === '/' ? `/${n}` : `${dir}/${n}`
      return { name: n, isDir: fs.isDirectory(full) }
    })
    .sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1))
    .map((e) => (e.isDir ? `  ${e.name}/` : `  ${e.name}`))
  return [`${dir}:`, ...rows].join('\n')
}

export const handler: CommandHandler = (args, context) => {
  const tokens = tokenize(args.join(' '))
  const sub = tokens[0]
  const fs = context.fileSystem
  const fail = (msg: string): ReturnType<CommandHandler> => ({ success: false, error: `notes: ${msg}` })

  if (!sub) {
    return { success: true, data: { openNotesModal: true } }
  }

  // Resolve the (optional) path operand, constrained to the notes directory.
  const rawPath = tokens[1]
  const resolved = rawPath ? resolveNotePath(fs, rawPath) : { path: NOTES_DIR }
  if ('error' in resolved) return fail(resolved.error)
  const path = resolved.path

  switch (sub) {
    case 'ls': {
      const target = path
      if (!fs.exists(target)) return fail(`${rawPath ?? target}: no such directory`)
      if (!fs.isDirectory(target)) return fail(`${rawPath}: not a directory`)
      return { success: true, data: { output: renderListing(fs, target) } }
    }

    case 'new':
    case 'edit': {
      if (!rawPath) return fail(`${sub}: missing path`)
      if (fs.getEntry(path)?.type === 'directory') return fail(`${rawPath}: is a directory`)
      let content = ''
      try {
        content = fs.readFile(path)
      } catch {
        // new file — created on save
      }
      return { success: true, data: { editorFilePath: path, editorContent: content } }
    }

    case 'open': {
      if (!rawPath) return fail('open: missing path')
      const entry = fs.getEntry(path)
      if (!entry) return fail(`${rawPath}: no such note`)
      if (entry.type === 'directory') return fail(`${rawPath}: is a directory`)
      return { success: true, data: { markdownFilePath: path, markdownContent: fs.readFile(path) } }
    }

    case 'mkdir': {
      if (!rawPath) return fail('mkdir: missing path')
      return { success: true, data: { notesMkdirPath: path } }
    }

    case 'rm': {
      if (!rawPath) return fail('rm: missing path')
      if (path === NOTES_DIR) return fail(`refusing to remove ${NOTES_DIR}`)
      if (!fs.exists(path)) return fail(`${rawPath}: no such note`)
      return { success: true, data: { notesRemovePath: path } }
    }

    default:
      return fail(`unknown subcommand '${sub}' (try: ls, new, open, edit, mkdir, rm)`)
  }
}

export const effect: CommandEffect = (result, context) => {
  if (!result.success) return 'continue'
  const data = result.data
  if (!data) return 'continue'

  if (data.openNotesModal) {
    context.openNotes()
    return 'handled'
  }
  if (data.notesMkdirPath) {
    const r = context.notesMkdir(data.notesMkdirPath)
    context.addLine(r.ok ? 'output' : 'error', r.message)
    return 'handled'
  }
  if (data.notesRemovePath) {
    const r = context.notesRemove(data.notesRemovePath)
    context.addLine(r.ok ? 'output' : 'error', r.message)
    return 'handled'
  }
  if (data.editorFilePath !== undefined) {
    // Ensure the parent folder exists so a new nested note is browsable.
    const parent = context.fileSystem.getParent(data.editorFilePath)
    if (!context.fileSystem.exists(parent)) context.fileSystem.createDirectory(parent)
    context.openEditor(data.editorFilePath, data.editorContent || '')
    return 'handled'
  }
  if (data.markdownFilePath !== undefined) {
    context.openMarkdown(data.markdownFilePath, data.markdownContent || '')
    return 'handled'
  }
  return 'continue'
}

// ─── Notes browser (NotesModal) ──────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useTerminalStore } from '../terminalStore'

type Mode = null | 'new' | 'mkdir' | 'confirm'

export function NotesModal() {
  const notesOpen = useTerminalStore((s) => s.notesOpen)
  const markdownOpen = useTerminalStore((s) => s.markdownOpen)
  const editorOpen = useTerminalStore((s) => s.editorOpen)
  const fsVersion = useTerminalStore((s) => s.fsVersion)
  const fileSystem = useTerminalStore((s) => s.fileSystem)
  const closeNotes = useTerminalStore((s) => s.closeNotes)
  const openEditor = useTerminalStore((s) => s.openEditor)
  const openNoteFile = useTerminalStore((s) => s.openNoteFile)
  const notesMkdir = useTerminalStore((s) => s.notesMkdir)
  const notesRemove = useTerminalStore((s) => s.notesRemove)

  const [cwd, setCwd] = useState(NOTES_DIR)
  const [selIdx, setSelIdx] = useState(0)
  const [mode, setMode] = useState<Mode>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  // Recompute listing on every render; fsVersion in the subscription forces a
  // re-render after create/delete/save mutations.
  void fsVersion
  let entries: { name: string; isDir: boolean }[] = []
  try {
    if (fileSystem.isDirectory(cwd)) {
      entries = fileSystem
        .listDirectory(cwd)
        .map((n) => ({ name: n, isDir: fileSystem.isDirectory(join(cwd, n)) }))
        .sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1))
    }
  } catch {
    entries = []
  }
  const sIdx = entries.length ? Math.min(selIdx, entries.length - 1) : 0
  const selected = entries[sIdx]

  useEffect(() => {
    if (notesOpen) {
      setCwd(NOTES_DIR)
      setSelIdx(0)
      setMode(null)
      setInput('')
      setError('')
    }
  }, [notesOpen])

  const isTextMode = mode === 'new' || mode === 'mkdir'

  function submitText() {
    setError('')
    const name = input.trim()
    if (!name) return setError('name required')
    if (name.includes('/')) return setError('use a single name (create folders with [f])')
    const target = join(cwd, name)
    if (mode === 'new') {
      openEditor(target, '')
    } else if (mode === 'mkdir') {
      const r = notesMkdir(target)
      if (!r.ok) return setError(r.message)
    }
    setMode(null)
    setInput('')
  }

  useEffect(() => {
    if (!notesOpen || markdownOpen || editorOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (isTextMode) return

      if (mode === 'confirm') {
        e.preventDefault()
        if ((e.key === 'y' || e.key === 'Enter') && selected) {
          const r = notesRemove(join(cwd, selected.name))
          if (!r.ok) setError(r.message)
          setSelIdx((i) => Math.max(0, i - 1))
        }
        setMode(null)
        return
      }

      const key = e.key
      if (key === 'Escape') {
        e.preventDefault()
        closeNotes()
        return
      }
      if (key === 'ArrowDown' || key === 'j') {
        e.preventDefault()
        setSelIdx((i) => Math.min(i + 1, entries.length - 1))
        return
      }
      if (key === 'ArrowUp' || key === 'k') {
        e.preventDefault()
        setSelIdx((i) => Math.max(i - 1, 0))
        return
      }
      if (key === 'Backspace' || key === 'ArrowLeft') {
        e.preventDefault()
        if (cwd !== NOTES_DIR) {
          setCwd(fileSystem.getParent(cwd))
          setSelIdx(0)
        }
        return
      }
      if (key === 'Enter' || key === 'ArrowRight') {
        e.preventDefault()
        if (!selected) return
        const full = join(cwd, selected.name)
        if (selected.isDir) {
          setCwd(full)
          setSelIdx(0)
        } else {
          openNoteFile(full)
        }
        return
      }
      if (key === 'e') {
        e.preventDefault()
        if (selected && !selected.isDir) {
          const full = join(cwd, selected.name)
          let content = ''
          try {
            content = fileSystem.readFile(full)
          } catch {
            /* empty */
          }
          openEditor(full, content)
        }
        return
      }
      if (key === 'n') {
        e.preventDefault()
        setInput('')
        setError('')
        setMode('new')
        return
      }
      if (key === 'f') {
        e.preventDefault()
        setInput('')
        setError('')
        setMode('mkdir')
        return
      }
      if (key === 'd') {
        e.preventDefault()
        if (selected) setMode('confirm')
        return
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [
    notesOpen,
    markdownOpen,
    editorOpen,
    mode,
    isTextMode,
    cwd,
    selected,
    entries.length,
    fileSystem,
    closeNotes,
    openEditor,
    openNoteFile,
    notesRemove,
  ])

  if (!notesOpen) return null

  const border = 'color-mix(in srgb, var(--color-terminal-green) 30%, transparent)'
  const breadcrumb = cwd === NOTES_DIR ? NOTES_DIR : cwd

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={() => closeNotes()}
    >
      <div
        className="flex flex-col w-[90vw] h-[85vh] max-w-3xl bg-terminal-bg border-2 rounded-lg overflow-hidden"
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
          <span className="text-terminal-green font-bold terminal-glow">NOTES</span>
          <span className="text-terminal-green-dark text-xs font-mono">{breadcrumb}</span>
        </div>

        {/* Listing */}
        <div className="flex-1 overflow-y-auto p-2 terminal-scrollbar font-mono text-sm">
          {cwd !== NOTES_DIR && (
            <div className="px-2 py-1 text-terminal-green-dark">../</div>
          )}
          {entries.length === 0 ? (
            <div className="px-2 py-3 text-terminal-green-dark italic">
              Empty — press <b className="text-terminal-green">n</b> for a note,{' '}
              <b className="text-terminal-green">f</b> for a folder.
            </div>
          ) : (
            entries.map((e, i) => {
              const active = i === sIdx
              return (
                <div
                  key={e.name}
                  className={`px-2 py-1 rounded flex items-center gap-2 ${active ? 'bg-terminal-green/15' : ''}`}
                >
                  <span className={e.isDir ? 'text-terminal-cyan' : 'text-terminal-yellow'}>
                    {e.isDir ? '▸' : '•'}
                  </span>
                  <span className={e.isDir ? 'text-terminal-cyan' : 'text-terminal-green'}>
                    {e.name}
                    {e.isDir ? '/' : ''}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Input row */}
        {isTextMode && (
          <div
            className="px-4 py-2 border-t bg-terminal-bg font-mono text-sm"
            style={{ borderTopColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
          >
            <label className="text-terminal-green-dark mr-2">
              {mode === 'new' ? 'New note name:' : 'New folder name:'}
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
              className="bg-terminal-bg text-terminal-green outline-none border-b border-terminal-green/40 w-1/2"
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
              Delete {selected?.name}? <span className="text-terminal-green font-bold">[y]</span> yes · any other key cancels
            </span>
          ) : (
            <span>
              <b className="text-terminal-green">↑↓</b> nav · <b className="text-terminal-green">enter</b> open · <b className="text-terminal-green">←</b> up · <b className="text-terminal-green">e</b> edit · <b className="text-terminal-green">n</b> new note · <b className="text-terminal-green">f</b> new folder · <b className="text-terminal-green">d</b> del · <b className="text-terminal-green">esc</b> close
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function join(dir: string, name: string): string {
  return dir === '/' ? `/${name}` : `${dir}/${name}`
}
