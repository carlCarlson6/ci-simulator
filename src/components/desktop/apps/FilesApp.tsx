// src/components/desktop/apps/FilesApp.tsx
// Mouse-driven file manager over the shared in-memory FileSystem.
// Reuses the store's generic mutation helpers (notesMkdir / notesRemove /
// createNote) — despite the names they work on any path and handle
// persistence + server sync + fsVersion bumps.
import { useState } from 'react'
import { useTerminalStore } from '../../../lib/terminalStore'

type Mode = null | 'newfile' | 'newdir'

function join(dir: string, name: string): string {
  return dir === '/' ? `/${name}` : `${dir}/${name}`
}

export function FilesApp() {
  const fileSystem = useTerminalStore((s) => s.fileSystem)
  const fsVersion = useTerminalStore((s) => s.fsVersion)
  const openEditor = useTerminalStore((s) => s.openEditor)
  const openMarkdown = useTerminalStore((s) => s.openMarkdown)
  const createDir = useTerminalStore((s) => s.notesMkdir)
  const removeEntry = useTerminalStore((s) => s.notesRemove)
  const createFile = useTerminalStore((s) => s.createNote)

  const [cwd, setCwd] = useState('/')
  const [selName, setSelName] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  // fsVersion in the subscription re-renders the listing after any command
  // or GUI mutation touches the file system.
  void fsVersion
  let entries: { name: string; isDir: boolean }[] = []
  try {
    entries = fileSystem
      .listDirectory(cwd)
      .map((n) => ({ name: n, isDir: fileSystem.isDirectory(join(cwd, n)) }))
      .sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1))
  } catch {
    entries = []
  }
  const selected = entries.find((e) => e.name === selName) ?? null

  function enterDir(path: string) {
    setCwd(path)
    setSelName(null)
    setConfirming(false)
    setError('')
  }

  function openFile(path: string) {
    let content = ''
    try {
      content = fileSystem.readFile(path)
    } catch {
      return
    }
    if (path.endsWith('.md')) openMarkdown(path, content)
    else openEditor(path, content)
  }

  function activate(entry: { name: string; isDir: boolean }) {
    const full = join(cwd, entry.name)
    if (entry.isDir) enterDir(full)
    else openFile(full)
  }

  function editSelected() {
    if (!selected || selected.isDir) return
    const full = join(cwd, selected.name)
    let content = ''
    try {
      content = fileSystem.readFile(full)
    } catch {
      /* empty file */
    }
    openEditor(full, content)
  }

  function deleteSelected() {
    if (!selected) return
    const r = removeEntry(join(cwd, selected.name))
    if (!r.ok) setError(r.message)
    setSelName(null)
    setConfirming(false)
  }

  function submitNew() {
    setError('')
    const name = input.trim()
    if (!name) return setError('name required')
    if (name.includes('/')) return setError('use a single name (no /)')
    const target = join(cwd, name)
    if (mode === 'newdir') {
      const r = createDir(target)
      if (!r.ok) return setError(r.message)
    } else {
      if (fileSystem.exists(target)) return setError(`${name}: already exists`)
      const r = createFile(target)
      if (!r.ok) return setError(r.message)
      openEditor(target, '')
    }
    setMode(null)
    setInput('')
    setSelName(name)
  }

  const segments = cwd.split('/').filter(Boolean)
  const border = 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)'

  return (
    <div className="flex flex-col h-full bg-terminal-bg font-mono text-sm">
      {/* Toolbar */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderBottomColor: border }}
      >
        <ToolButton disabled={cwd === '/'} onClick={() => enterDir(fileSystem.getParent(cwd))}>
          ↑ up
        </ToolButton>

        {/* Breadcrumb */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto text-terminal-green-dark min-w-0">
          <button className="hover:text-terminal-green cursor-pointer" onClick={() => enterDir('/')}>
            /
          </button>
          {segments.map((seg, i) => {
            const path = '/' + segments.slice(0, i + 1).join('/')
            return (
              <span key={path} className="flex items-center gap-1 shrink-0">
                <button className="hover:text-terminal-green cursor-pointer" onClick={() => enterDir(path)}>
                  {seg}
                </button>
                {i < segments.length - 1 && <span className="opacity-50">/</span>}
              </span>
            )
          })}
        </div>

        <ToolButton onClick={() => { setMode('newfile'); setInput(''); setError('') }}>+ file</ToolButton>
        <ToolButton onClick={() => { setMode('newdir'); setInput(''); setError('') }}>+ folder</ToolButton>
        <ToolButton disabled={!selected || selected.isDir} onClick={editSelected}>
          edit
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

      {/* Listing */}
      <div className="flex-1 overflow-y-auto terminal-scrollbar p-2">
        {entries.length === 0 ? (
          <div className="px-2 py-3 text-terminal-green-dark italic">Empty directory.</div>
        ) : (
          entries.map((e) => {
            const active = e.name === selName
            return (
              <div
                key={e.name}
                onClick={() => { setSelName(e.name); setConfirming(false) }}
                onDoubleClick={() => activate(e)}
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

      {/* New file / folder input */}
      {mode !== null && (
        <div className="shrink-0 px-3 py-2 border-t flex items-center gap-2" style={{ borderTopColor: border }}>
          <label className="text-terminal-green-dark">
            {mode === 'newfile' ? 'New file name:' : 'New folder name:'}
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
        <span>double-click to open · .md files render as markdown</span>
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
