// src/components/TerminalOutput.tsx
import { useEffect, useRef } from 'react'
import { useTerminalStore } from '../lib/terminalStore'

function renderPrompt(content: string) {
  const rest = content.slice(5) // after 'user:'
  const spaceIdx = rest.indexOf(' ')
  const path = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx)
  const command = spaceIdx === -1 ? '' : rest.slice(spaceIdx)
  return (
    <span>
      <span className="text-terminal-green font-bold">user</span>
      <span className="text-terminal-green-dark">:</span>
      <span className="text-terminal-green-dark">{path}</span>
      <span>{command}</span>
    </span>
  )
}

export function TerminalOutput() {
  const lines = useTerminalStore((state) => state.lines)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  return (
    <div
      ref={scrollRef}
      className="flex-1 h-full overflow-y-auto terminal-scrollbar terminal-glow"
    >
      {lines.map((line) => (
        <div
          key={line.id}
           className={`whitespace-pre-wrap break-all ${
             line.type === 'error'
               ? 'text-terminal-red terminal-glow-red'
               : line.type === 'system'
               ? 'text-terminal-yellow'
               : line.type === 'prompt'
               ? 'text-terminal-green font-bold mb-1'
               : 'text-terminal-green-dim'
           }`}
        >
          {line.type === 'prompt' && line.content.startsWith('user:') ? (
            renderPrompt(line.content)
          ) : (
            line.content
          )}
        </div>
      ))}
    </div>
  )
}
