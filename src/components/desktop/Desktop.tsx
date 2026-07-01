// src/components/desktop/Desktop.tsx
// Desktop environment for /desktop: wallpaper, icons, window manager and
// taskbar over the same terminalStore session the fullscreen terminal uses.
import { useEffect, useRef } from 'react'
import { useTerminalStore } from '../../lib/terminalStore'
import { useDesktopStore, topWindowId, isAppId } from '../../lib/desktopStore'
import type { AppId } from '../../lib/desktopStore'
import { getTheme, getDefaultTheme } from '../../lib/themes'
import { AuthSyncGate } from '../../lib/auth'
import { bootTerminalSession } from '../../lib/terminalBoot'
import { Window } from './Window'
import { Taskbar } from './Taskbar'
import { DesktopIcons } from './DesktopIcons'
import { TerminalApp } from './apps/TerminalApp'
import { FilesApp } from './apps/FilesApp'
import { NotesApp } from './apps/NotesApp'
import { TasksApp } from './apps/TasksApp'
import { SettingsApp } from './apps/SettingsApp'
import { EditorModal } from '../../lib/commands/edit'
import { MarkdownModal } from '../../lib/commands/md'
import { NotePickerModal } from '../../lib/commands/notePicker'
import { Route } from '../../routes/desktop'

function AppContent({ appId }: { appId: AppId }) {
  switch (appId) {
    case 'terminal':
      return <TerminalApp />
    case 'files':
      return <FilesApp />
    case 'notes':
      return <NotesApp />
    case 'tasks':
      return <TasksApp />
    case 'settings':
      return <SettingsApp />
  }
}

export function Desktop() {
  const loaderData = Route.useLoaderData()
  const search = Route.useSearch()
  const currentTheme = useTerminalStore((state) => state.currentTheme)
  const notesOpen = useTerminalStore((state) => state.notesOpen)
  const tasksOpen = useTerminalStore((state) => state.tasksOpen)
  const windows = useDesktopStore((state) => state.windows)
  const openApp = useDesktopStore((state) => state.openApp)
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    bootTerminalSession(loaderData?.user ?? null, loaderData?.serverState ?? null)
    // First visit opens ?app=<id> (or the terminal); reopening the route
    // keeps whatever windows are already up.
    if (useDesktopStore.getState().windows.length === 0) {
      openApp(isAppId(search.app) ? search.app : 'terminal')
    }
  }, [loaderData, search.app, openApp])

  // `notes` / `tasks` typed in the embedded terminal open desktop windows
  // instead of the fullscreen modals used on /.
  useEffect(() => {
    if (notesOpen) {
      useTerminalStore.setState({ notesOpen: false })
      openApp('notes')
    }
  }, [notesOpen, openApp])
  useEffect(() => {
    if (tasksOpen) {
      useTerminalStore.setState({ tasksOpen: false })
      openApp('tasks')
    }
  }, [tasksOpen, openApp])

  const theme = getTheme(currentTheme) || getDefaultTheme()
  const topId = topWindowId(windows)

  return (
    <div
      className="fixed inset-0 overflow-hidden font-mono desktop-wallpaper"
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

      {/* Wallpaper grid */}
      <div className="absolute inset-0 desktop-grid pointer-events-none" />

      <DesktopIcons />

      {/* Window layer (z-10 isolates window z-indexes from the taskbar;
          pointer-events-none lets clicks through to the icons below) */}
      <div className="absolute inset-x-0 top-0 bottom-10 z-10 pointer-events-none">
        {windows.map((win) => (
          <Window key={win.id} win={win} focused={win.id === topId}>
            <AppContent appId={win.appId} />
          </Window>
        ))}
      </div>

      <Taskbar />

      {/* Shared overlays (edit / md / note picker keep working on the desktop) */}
      <EditorModal />
      <MarkdownModal />
      <NotePickerModal />

      {/* CRT scanlines, subtler than the fullscreen terminal */}
      <div className="absolute inset-0 pointer-events-none z-30 terminal-scanlines opacity-10" />
    </div>
  )
}
