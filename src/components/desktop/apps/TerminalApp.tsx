// src/components/desktop/apps/TerminalApp.tsx
// The same terminal, windowed: reuses the fullscreen route's output/input
// components against the shared terminalStore session.
import { TerminalOutput } from '../../TerminalOutput'
import { TerminalInput } from '../../TerminalInput'

export function TerminalApp() {
  return (
    <div className="flex flex-col h-full bg-terminal-bg font-mono">
      <div className="flex-1 min-h-0 overflow-hidden">
        <TerminalOutput />
      </div>
      <div className="shrink-0 px-3 py-2 terminal-input-border bg-terminal-bg">
        <TerminalInput />
      </div>
    </div>
  )
}
