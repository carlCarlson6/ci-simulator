import { useState } from 'react'
import { useDesktopStore } from '../../lib/desktopStore'
import type { WindowApp } from '../../lib/desktopStore'
import { useTerminalStore } from '../../lib/terminalStore'
import { getTheme, getDefaultTheme } from '../../lib/themes'
import { DesktopBackground } from './DesktopBackground'
import { DesktopNav } from './DesktopNav'
import { DesktopIcons } from './DesktopIcons'
import { Window } from './Window'
import { Taskbar } from './Taskbar'
import { StartMenu } from './StartMenu'
import { FileManager } from './FileManager'

export function Desktop() {
  const [startMenuOpen, setStartMenuOpen] = useState(false)
  const currentTheme = useTerminalStore((s) => s.currentTheme)
  const windows = useDesktopStore((s) => s.windows)
  const openWindow = useDesktopStore((s) => s.openWindow)
  const closeWindow = useDesktopStore((s) => s.closeWindow)
  const minimizeWindow = useDesktopStore((s) => s.minimizeWindow)
  const restoreWindow = useDesktopStore((s) => s.restoreWindow)
  const focusWindow = useDesktopStore((s) => s.focusWindow)
  const moveWindow = useDesktopStore((s) => s.moveWindow)
  const resizeWindow = useDesktopStore((s) => s.resizeWindow)

  const theme = getTheme(currentTheme) || getDefaultTheme()

  const handleOpenApp = (app: WindowApp, label: string) => {
    openWindow(app, label)
  }

  return (
    <div
      className="flex flex-col h-screen w-screen bg-black overflow-hidden"
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
      <DesktopNav />
      <div className="relative flex-1 overflow-hidden">
        <DesktopBackground />
        <DesktopIcons onOpen={handleOpenApp} />

        {windows.map((win) => (
          <Window
            key={win.id}
            id={win.id}
            title={win.title}
            x={win.x}
            y={win.y}
            width={win.width}
            height={win.height}
            minimized={win.minimized}
            focused={win.focused}
            zIndex={win.zIndex}
            onClose={() => closeWindow(win.id)}
            onMinimize={() => minimizeWindow(win.id)}
            onFocus={() => focusWindow(win.id)}
            onMove={(x, y) => moveWindow(win.id, x, y)}
            onResize={(w, h) => resizeWindow(win.id, w, h)}
          >
            {win.app === 'terminal' && (
              <div className="p-4 text-terminal-green-dim text-xs font-mono">
                Terminal window (TerminalEmbed will render here)
              </div>
            )}
            {win.app === 'files' && <FileManager />}
            {win.app === 'editor' && (
              <div className="p-4 text-terminal-green-dim text-xs font-mono">
                Editor (coming soon)
              </div>
            )}
            {win.app === 'settings' && (
              <div className="p-4 text-terminal-green-dim text-xs font-mono">
                Settings (coming soon)
              </div>
            )}
          </Window>
        ))}

        {/* Subtle vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle, transparent 60%, color-mix(in srgb, var(--color-terminal-green) 3%, transparent) 100%)`,
          }}
        />
      </div>

      <Taskbar onStartClick={() => setStartMenuOpen(!startMenuOpen)} />
      {startMenuOpen && <StartMenu onClose={() => setStartMenuOpen(false)} />}
    </div>
  )
}
