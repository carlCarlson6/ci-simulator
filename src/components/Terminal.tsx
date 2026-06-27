// src/components/Terminal.tsx
import { useEffect, useRef } from 'react'
import { useTerminalStore } from '../lib/terminalStore'
import { TerminalOutput } from './TerminalOutput'
import { TerminalInput } from './TerminalInput'

export function Terminal() {
  const initialize = useTerminalStore((state) => state.initialize)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      ;(window as any).__START_TIME = Date.now()
      initialize()
    }
  }, [initialize])

  return (
    <div className="flex flex-col h-screen w-screen bg-terminal-bg text-terminal-green font-mono text-sm overflow-hidden relative p-10">
      <div className="relative flex-1 flex flex-col min-h-0 z-10 border-2 border-terminal-green-dark/50 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,255,0,0.15)] p-5">
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TerminalOutput />
        </div>
        <div className="shrink-0 w-full">
          <TerminalInput />
        </div>
      </div>
      {/* Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 terminal-scanlines opacity-30" />
      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background: 'radial-gradient(circle, transparent 60%, rgba(0, 255, 0, 0.03) 100%)',
        }}
      />
    </div>
  )
}
