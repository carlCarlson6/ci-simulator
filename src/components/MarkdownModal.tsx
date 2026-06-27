// src/components/MarkdownModal.tsx
import { useEffect, useCallback } from 'react'
import { useTerminalStore } from '../lib/terminalStore'
import { markdownParser } from '../lib/markdownParser'

export function MarkdownModal() {
  const markdownFilePath = useTerminalStore((state) => state.markdownFilePath)
  const markdownContent = useTerminalStore((state) => state.markdownContent)
  const closeMarkdown = useTerminalStore((state) => state.closeMarkdown)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeMarkdown()
      }
    },
    [closeMarkdown]
  )

  useEffect(() => {
    if (markdownFilePath) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [markdownFilePath, handleKeyDown])

  if (!markdownFilePath) return null

  const fileName = markdownFilePath.split('/').pop() || markdownFilePath

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={() => closeMarkdown()}
    >
      <div
        className="flex flex-col w-[90vw] h-[85vh] max-w-4xl bg-terminal-bg border-2 rounded-lg overflow-hidden"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-terminal-green) 30%, transparent)',
          boxShadow: '0 0 30px color-mix(in srgb, var(--color-terminal-green) 15%, transparent)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b bg-terminal-bg"
          style={{ borderBottomColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
        >
          <span className="text-terminal-green font-bold terminal-glow">
            MARKDOWN: {fileName}
          </span>
          <span className="text-terminal-green-dark text-xs font-mono">
            {markdownFilePath}
          </span>
        </div>

        {/* Rendered content */}
        <div className="flex-1 overflow-y-auto p-4 terminal-scrollbar font-mono text-sm terminal-glow">
          {markdownParser(markdownContent || '')}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t bg-terminal-bg text-terminal-green-dark text-xs font-mono"
          style={{ borderTopColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
        >
          <span>
            <span className="text-terminal-green font-bold">[Esc]</span> Close
          </span>
        </div>
      </div>
    </div>
  )
}
