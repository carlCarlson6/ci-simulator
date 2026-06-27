// src/components/TerminalOutput.tsx
import { useEffect, useRef } from 'react'
import { useTerminalStore } from '../lib/terminalStore'

function renderPrompt(content: string) {
  const colonIdx = content.indexOf(':')
  if (colonIdx === -1) return <span>{content}</span>

  const prefix = content.slice(0, colonIdx)
  const rest = content.slice(colonIdx + 1)
  const spaceIdx = rest.indexOf(' ')
  const path = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx)
  const command = spaceIdx === -1 ? '' : rest.slice(spaceIdx)

  return (
    <span>
      <span className="text-terminal-green font-bold">{prefix}</span>
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
      className="h-full overflow-y-auto terminal-scrollbar p-4 pb-2"
    >
      {lines.map((line) => (
        <div
          key={line.id}
           className={`whitespace-pre-wrap break-all ${
             line.type === 'error'
                ? 'text-terminal-red'
               : line.type === 'system'
               ? 'text-terminal-yellow'
               : line.type === 'prompt'
               ? 'text-terminal-green font-bold mb-1'
                : 'text-terminal-green-dark opacity-70'
           }`}
        >
          {line.type === 'prompt' && line.content.includes(':') ? (
            renderPrompt(line.content)
          ) : (
            line.content
          )}
        </div>
      ))}
    </div>
  )
}
