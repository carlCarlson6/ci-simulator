import { CommandHandler, CommandEffect } from './types'

export const MANUAL = 'md\n\nRender markdown file contents as formatted HTML.\n\nUsage: md <file>'
export const HELP_TEXT = '  md <file>            Render markdown file'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'md: missing file operand' }
  }

  const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
  const entry = context.fileSystem.getEntry(resolved)

  if (!entry) {
    return { success: false, error: `md: ${args[0]}: No such file or directory` }
  }

  if (entry.type === 'directory') {
    return { success: false, error: `md: ${args[0]}: Is a directory` }
  }

  const content = context.fileSystem.readFile(resolved)

  return {
    success: true,
    data: {
      markdownFilePath: resolved,
      markdownContent: content,
    },
  }
}

export const effect: CommandEffect = (result, context) => {
  if (result.success && result.data?.markdownFilePath !== undefined) {
    context.openMarkdown(
      result.data.markdownFilePath,
      result.data.markdownContent || ''
    )
    return 'handled'
  }
  return 'continue'
}

// src/components/MarkdownModal.tsx
import { useEffect, useCallback } from 'react'
import { useTerminalStore } from '../terminalStore'
import { markdownParser } from '../markdownParser'

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
