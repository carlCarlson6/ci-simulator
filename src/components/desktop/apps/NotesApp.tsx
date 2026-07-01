// src/components/desktop/apps/NotesApp.tsx
// Mouse-driven notes browser: listing on the left, live markdown preview on
// the right. Same /notes-app tree the `notes` command manages.
import { useEffect, useState } from 'react'
import { useTerminalStore } from '../../../lib/terminalStore'
import { NOTES_DIR } from '../../../lib/tasks'
import { markdownParser } from '../../../lib/commands/md'

type Mode = null | 'new' | 'mkdir'

function join(dir: string, name: string): string {
  return dir === '/' ? `/${name}` : `${dir}/${name}`
}

export function NotesApp() {
  const fileSystem = useTerminalStore((s) => s.fileSystem)
  const fsVersion = useTerminalStore((s) => s.fsVersion)
  const openEditor = useTerminalStore((s) => s.openEditor)
  const openMarkdown = useTerminalStore((s) => s.openMarkdown)
  const notesMkdir = useTerminalStore((s) => s.notesMkdir)
  const notesRemove = useTerminalStore((s) => s.notesRemove)

  const [cwd, setCwd] = useState(NOTES_DIR)
  const [selName, setSelName] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  // Make sure the notes root exists before first listing.
  useEffect(() => {
    const st = useTerminalStore.getState()
    if (!st.fileSystem.exists(NOTES_DIR)) st.notesMkdir(NOTES_DIR)
  }, [])

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
  const selected = entries.find((e) => e.name === selName) ?? null

  let previewContent: string | null = null
  if (selected && !selected.isDir) {
    try {
      previewContent = fileSystem.readFile(join(cwd, selected.name))
    } catch {
      previewContent = null
    }
  }

  function enterDir(path: string) {
    setCwd(path)
    setSelName(null)
    setConfirming(false)
    setError('')
  }

  function editSelected() {
    if (!selected || selected.isDir) return
    const full = join(cwd, selected.name)
    let content = ''
    try {
      content = fileSystem.readFile(full)
    } catch {
      /* empty note */
    }
    openEditor(full, content)
  }

  function submitNew() {
    setError('')
    const name = input.trim()
    if (!name) return setError('name required')
    if (name.includes('/')) return setError('use a single name (no /)')
    const target = join(cwd, name)
    if (mode === 'new') {
      openEditor(target, '')
      setSelName(name)
    } else if (mode === 'mkdir') {
      const r = notesMkdir(target)
      if (!r.ok) return setError(r.message)
    }
    setMode(null)
    setInput('')
  }

  function deleteSelected() {
    if (!selected) return
    const r = notesRemove(join(cwd, selected.name))
    if (!r.ok) setError(r.message)
    setSelName(null)
    setConfirming(false)
  }

  const border = 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)'

  return (
    <div className="flex flex-col h-full bg-terminal-bg font-mono text-sm">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b" style={{ borderBottomColor: border }}>
        <ToolButton disabled={cwd === NOTES_DIR} onClick={() => enterDir(fileSystem.getParent(cwd))}>
          ↑ up
        </ToolButton>
        <span className="flex-1 text-terminal-green-dark text-xs truncate">{cwd}</span>
        <ToolButton onClick={() => { setMode('new'); setInput(''); setError('') }}>+ note</ToolButton>
        <ToolButton onClick={() => { setMode('mkdir'); setInput(''); setError('') }}>+ folder</ToolButton>
        <ToolButton disabled={!selected || selected.isDir} onClick={editSelected}>
          edit
        </ToolButton>
        <ToolButton
          disabled={!selected || selected.isDir}
          onClick={() => {
            if (selected) openMarkdown(join(cwd, selected.name), previewContent ?? '')
          }}
        >
          view
        </ToolButton>
        {confirming ? (
          <ToolButton danger onClick={deleteSelected}>
            confirm?
          </ToolButton>
        ) : (
          <ToolButton danger disabled={!selected} onClick={() => setConfirming(true)}>
            delete
          </ToolButton>
        )}
      </div>

      {/* Body: listing | preview */}
      <div className="flex flex-1 min-h-0">
        <div
          className="w-2/5 overflow-y-auto p-2 terminal-scrollbar border-r"
          style={{ borderRightColor: border }}
        >
          {entries.length === 0 ? (
            <div className="px-2 py-3 text-terminal-green-dark italic">
              Empty — use <b className="text-terminal-green">+ note</b> or{' '}
              <b className="text-terminal-green">+ folder</b>.
            </div>
          ) : (
            entries.map((e) => {
              const active = e.name === selName
              return (
                <div
                  key={e.name}
                  onClick={() => { setSelName(e.name); setConfirming(false) }}
                  onDoubleClick={() => {
                    if (e.isDir) {
                      enterDir(join(cwd, e.name))
                    } else {
                      let content = ''
                      try {
                        content = fileSystem.readFile(join(cwd, e.name))
                      } catch {
                        /* empty note */
                      }
                      openEditor(join(cwd, e.name), content)
                    }
                  }}
                  className={`px-2 py-1 rounded flex items-center gap-2 cursor-pointer ${
                    active ? 'bg-terminal-green/15' : 'hover:bg-terminal-green/5'
                  }`}
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

        <div className="flex-1 overflow-y-auto p-4 terminal-scrollbar terminal-glow min-w-0">
          {selected && selected.isDir ? (
            <div className="text-terminal-green-dark italic">
              <span className="text-terminal-cyan">{selected.name}/</span> — folder. Double-click to open.
            </div>
          ) : previewContent !== null ? (
            previewContent.trim() === '' ? (
              <div className="text-terminal-green-dark italic">Empty note.</div>
            ) : (
              markdownParser(previewContent)
            )
          ) : (
            <div className="text-terminal-green-dark italic">
              {entries.length === 0 ? 'No note selected.' : 'Select a note to preview.'}
            </div>
          )}
        </div>
      </div>

      {/* New note / folder input */}
      {mode !== null && (
        <div className="shrink-0 px-3 py-2 border-t flex items-center gap-2" style={{ borderTopColor: border }}>
          <label className="text-terminal-green-dark">
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
                submitNew()
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
        <span>{error ? <span className="text-terminal-red">{error}</span> : `${entries.length} item(s)`}</span>
        <span>notes live under {NOTES_DIR}</span>
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
