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
      <span className="text-terminal-cyan opacity-80"> $</span>
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
      className="h-full overflow-y-auto terminal-scrollbar p-4 pb-2 flex flex-col gap-px"
    >
      {lines.map((line) => {
        if (line.type === 'error') {
          return (
            <div key={line.id} className="whitespace-pre-wrap break-all text-terminal-red terminal-glow-red leading-snug">
              {line.content}
            </div>
          )
        }
        if (line.type === 'system') {
          return (
            <div key={line.id} className="whitespace-pre-wrap break-all text-terminal-yellow terminal-glow-yellow terminal-system-line leading-snug">
              {line.content}
            </div>
          )
        }
        if (line.type === 'prompt') {
          return (
            <div key={line.id} className="whitespace-pre-wrap break-all text-terminal-green font-bold mt-2 first:mt-0 leading-snug">
              {line.content.includes(':') ? renderPrompt(line.content) : line.content}
            </div>
          )
        }
        return (
          <div key={line.id} className="whitespace-pre-wrap break-all text-terminal-green-dark leading-snug">
            {line.content}
          </div>
        )
      })}
    </div>
  )
}
