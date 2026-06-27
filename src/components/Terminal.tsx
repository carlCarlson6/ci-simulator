// src/components/Terminal.tsx
import { useEffect, useRef } from 'react'
import { useTerminalStore } from '../lib/terminalStore'
import { getTheme, getDefaultTheme } from '../lib/themes'
import { TerminalOutput } from './TerminalOutput'
import { TerminalInput } from './TerminalInput'

export function Terminal() {
  const initialize = useTerminalStore((state) => state.initialize)
  const currentTheme = useTerminalStore((state) => state.currentTheme)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      ;(window as any).__START_TIME = Date.now()
      initialize()
    }
  }, [initialize])

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
      <div className="relative flex-1 flex flex-col min-h-0 z-10 border-2 border-terminal-green-dark/50 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,255,0,0.15)]">
        <div className="flex-1 overflow-hidden min-h-0">
          <TerminalOutput />
        </div>
        <div className="shrink-0 w-full p-4 pt-2">
          <TerminalInput />
        </div>
      </div>
      {/* Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 terminal-scanlines opacity-30" />
      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: `radial-gradient(circle, transparent 60%, color-mix(in srgb, var(--color-terminal-green) 3%, transparent) 100%)`,
        }}
      />
    </div>
  )
}
