// src/components/Terminal.tsx
import { useEffect } from 'react'
import { useTerminalStore } from '../lib/terminalStore'
import { getTheme, getDefaultTheme } from '../lib/themes'
import { AuthSyncGate } from '../lib/auth'
import { bootTerminalSession } from '../lib/terminalBoot'
import { TerminalOutput } from './TerminalOutput'
import { TerminalInput } from './TerminalInput'
import { EditorModal } from '~/lib/commands/edit'
import { MarkdownModal } from '~/lib/commands/md'
import { TasksModal } from '~/lib/commands/tasks'
import { NotesModal } from '~/lib/commands/notes'
import { NotePickerModal } from '~/lib/commands/notePicker'
import { Route } from '../routes/index'

export function Terminal() {
  const loaderData = Route.useLoaderData()
  const serverUser = loaderData?.user ?? null
  const serverState = loaderData?.serverState ?? null
  const currentTheme = useTerminalStore((state) => state.currentTheme)

  useEffect(() => {
    bootTerminalSession(serverUser, serverState)
  }, [serverUser, serverState])

  const theme = getTheme(currentTheme) || getDefaultTheme()

  return (
    <div
      className="flex flex-col h-screen w-screen bg-terminal-bg text-terminal-green font-mono overflow-hidden relative p-4 md:p-8 lg:p-10"
      style={{
        '--color-terminal-bg': theme.colors.bg,
        '--color-terminal-green': theme.colors.text,
        '--color-terminal-green-dim': theme.colors.textDim,
        '--color-terminal-green-dark': theme.colors.textDark,
        '--color-terminal-red': theme.colors.error,
        '--color-terminal-blue': theme.colors.blue,
        '--color-terminal-yellow': theme.colors.yellow,
        '--color-terminal-cyan': theme.colors.cyan,
        '--color-terminal-magenta': theme.colors.magenta,
      } as React.CSSProperties}
    >
      <AuthSyncGate />
      <div className="relative flex-1 flex flex-col min-h-0 z-10 border border-terminal-green-dark/40 rounded-lg overflow-hidden terminal-flicker"
        style={{ boxShadow: '0 0 30px color-mix(in srgb, var(--color-terminal-green) 12%, transparent), 0 0 60px color-mix(in srgb, var(--color-terminal-green) 4%, transparent)' }}
      >
        {/* Title bar */}
        <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-terminal-bg terminal-title-border select-none">
          <div className="flex items-center gap-3">
            <span className="text-terminal-green-dim text-xs tracking-widest uppercase opacity-60">ci-simulator</span>
            <span className="text-terminal-green-dim opacity-30">│</span>
            <span className="text-terminal-green-dark text-xs opacity-50 tracking-wide">{theme.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-green-dim opacity-40" />
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-green-dark opacity-50" />
            <span className="w-2.5 h-2.5 rounded-full terminal-glow"
              style={{ backgroundColor: 'var(--color-terminal-green)', opacity: 0.7 }}
            />
          </div>
        </div>

        {/* Output area */}
        <div className="flex-1 overflow-hidden min-h-0">
          <TerminalOutput />
        </div>

        {/* Input area */}
        <div className="shrink-0 w-full px-4 py-2 terminal-input-border bg-terminal-bg">
          <TerminalInput />
        </div>
      </div>
      <EditorModal />
      <TasksModal />
      <NotesModal />
      <NotePickerModal />
      <MarkdownModal />
      {/* Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 terminal-scanlines opacity-20" />
      {/* Corner vignette */}
      <div className="absolute inset-0 pointer-events-none z-20 terminal-vignette" />
    </div>
  )
}
