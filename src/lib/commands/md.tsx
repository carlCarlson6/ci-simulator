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

// ─── DIY Markdown Parser — emits React elements directly, zero XSS risk ──────

import React from 'react'

function MarkdownImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = React.useState(false)
  if (failed) {
    return React.createElement(
      'span',
      { className: 'text-terminal-red italic' },
      `[IMAGE FAILED: ${alt}]`
    )
  }
  return React.createElement('img', {
    src,
    alt,
    className: 'max-w-full h-auto my-2 block border border-terminal-green/20',
    onError: () => setFailed(true),
  })
}

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let remaining = text

  const patterns = [
    { regex: /\*\*(.+?)\*\*/, tag: 'strong' as const },
    { regex: /\*(.+?)\*/, tag: 'em' as const },
    { regex: /_(.+?)_/, tag: 'em' as const },
    { regex: /`(.+?)`/, tag: 'code' as const },
    { regex: /!\[([^\]]*)\]\(([^)]+)\)/, type: 'image' as const },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/, type: 'link' as const },
  ]

  while (remaining.length > 0) {
    let earliestIndex = Infinity
    let earliestMatch: RegExpMatchArray | null = null
    let earliestPattern = -1

    for (let i = 0; i < patterns.length; i++) {
      patterns[i].regex.lastIndex = 0
      const match = patterns[i].regex.exec(remaining)
      if (match && match.index < earliestIndex) {
        earliestIndex = match.index
        earliestMatch = match
        earliestPattern = i
      }
    }

    if (!earliestMatch || earliestPattern === -1) {
      nodes.push(remaining)
      break
    }

    if (earliestIndex > 0) {
      nodes.push(remaining.slice(0, earliestIndex))
    }

    const pattern = patterns[earliestPattern]
    const matchText = earliestMatch[0]

    if (pattern.tag) {
      const inner = earliestMatch[1]
      const classMap: Record<string, string> = {
        strong: 'text-terminal-green font-bold terminal-glow',
        em: 'text-terminal-cyan italic',
        code: 'text-terminal-yellow bg-terminal-bg px-1 rounded',
      }
      nodes.push(
        React.createElement(
          pattern.tag,
          { key: nodes.length, className: classMap[pattern.tag] },
          parseInline(inner)
        )
      )
    } else if (pattern.type === 'image') {
      const alt = earliestMatch[1]
      const url = earliestMatch[2]
      nodes.push(
        React.createElement(MarkdownImage, {
          key: nodes.length,
          src: url,
          alt: alt,
        })
      )
    } else if (pattern.type === 'link') {
      const linkText = earliestMatch[1]
      const url = earliestMatch[2]
      nodes.push(
        React.createElement(
          'span',
          { key: nodes.length, className: 'inline' },
          React.createElement(
            'span',
            { className: 'text-terminal-cyan underline cursor-default' },
            linkText
          ),
          React.createElement(
            'span',
            { className: 'text-terminal-green-dark ml-1' },
            `(${url})`
          )
        )
      )
    }

    remaining = remaining.slice(earliestIndex + matchText.length)
  }

  return nodes
}

function isBlockBoundary(line: string): boolean {
  return /^#{1,3}\s/.test(line) || line === '---' || line === '```'
}

function markdownParser(content: string): React.ReactNode[] {
  if (!content.trim()) return []

  const rawLines = content.split('\n')

  const blocks: string[][] = []
  let currentBlock: string[] = []
  let inCodeBlock = false

  function flushBlock() {
    if (currentBlock.length > 0) {
      blocks.push([...currentBlock])
      currentBlock = []
    }
  }

  for (const line of rawLines) {
    const trimmed = line.trimEnd()

    if (inCodeBlock) {
      if (trimmed === '```') {
        currentBlock.push(trimmed)
        blocks.push([...currentBlock])
        currentBlock = []
        inCodeBlock = false
      } else {
        currentBlock.push(line)
      }
      continue
    }

    if (trimmed === '```') {
      flushBlock()
      currentBlock.push(trimmed)
      inCodeBlock = true
      continue
    }

    if (trimmed === '') {
      flushBlock()
      continue
    }

    if (isBlockBoundary(trimmed)) {
      flushBlock()
      currentBlock.push(trimmed)
      continue
    }

    currentBlock.push(trimmed)
  }

  if (inCodeBlock && currentBlock.length > 0) {
    blocks.push(currentBlock)
  } else {
    flushBlock()
  }

  const elements: React.ReactNode[] = []

  for (const block of blocks) {
    const firstLine = block[0]
    const rest = block.slice(1)

    if (firstLine === '```') {
      const codeLines = block.slice(1)
      if (codeLines.length > 0 && codeLines[codeLines.length - 1] === '```') {
        codeLines.pop()
      }
      elements.push(
        React.createElement(
          'pre',
          { key: elements.length, className: 'bg-terminal-bg/50 p-3 rounded mb-3 overflow-x-auto terminal-scrollbar' },
          React.createElement(
            'code',
            { className: 'text-terminal-yellow font-mono text-sm whitespace-pre' },
            codeLines.join('\n')
          )
        )
      )
      continue
    }

    if (block.length === 1 && firstLine === '---') {
      elements.push(
        React.createElement('hr', {
          key: elements.length,
          className: 'border-terminal-green/30 my-4',
        })
      )
      continue
    }

    const headerMatch = firstLine.match(/^(#{1,3})\s+(.*)$/)
    if (headerMatch) {
      const level = headerMatch[1].length
      const text = headerMatch[2]
      const tag = `h${level}` as 'h1' | 'h2' | 'h3'
      const classMap = {
        h1: 'text-terminal-green text-xl font-bold mt-4 mb-2 border-b border-terminal-green/30',
        h2: 'text-terminal-green text-lg font-bold mt-3 mb-2 border-b border-terminal-green/30',
        h3: 'text-terminal-green text-base font-bold mt-2 mb-1',
      }
      elements.push(
        React.createElement(
          tag,
          { key: elements.length, className: classMap[tag] },
          parseInline(text)
        )
      )
      continue
    }

    const listItemMatch = firstLine.match(/^[-*]\s+(.*)$/)
    if (listItemMatch) {
      const listItems: React.ReactNode[] = []
      listItems.push(
        React.createElement(
          'li',
          { key: listItems.length, className: 'mb-1' },
          parseInline(listItemMatch[1])
        )
      )

      for (const line of rest) {
        const m = line.match(/^[-*]\s+(.*)$/)
        if (m) {
          listItems.push(
            React.createElement(
              'li',
              { key: listItems.length, className: 'mb-1' },
              parseInline(m[1])
            )
          )
        } else {
          break
        }
      }

      elements.push(
        React.createElement(
          'ul',
          { key: elements.length, className: 'text-terminal-green-dark mb-3 ml-4 list-disc' },
          listItems
        )
      )
      continue
    }

    const quoteMatch = firstLine.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      const quoteLines: React.ReactNode[] = []
      quoteLines.push(parseInline(quoteMatch[1]))

      for (const line of rest) {
        const m = line.match(/^>\s?(.*)$/)
        if (m) {
          quoteLines.push(React.createElement('br', { key: `br-${quoteLines.length}` }))
          quoteLines.push(parseInline(m[1]))
        } else {
          break
        }
      }

      elements.push(
        React.createElement(
          'blockquote',
          {
            key: elements.length,
            className:
              'border-l-2 border-terminal-green/30 pl-3 text-terminal-green-dark italic mb-3',
          },
          quoteLines
        )
      )
      continue
    }

    const paraText = block.join(' ')
    elements.push(
      React.createElement(
        'p',
        { key: elements.length, className: 'text-terminal-green-dark mb-3 leading-relaxed' },
        parseInline(paraText)
      )
    )
  }

  return elements
}

// src/components/MarkdownModal.tsx
import { useEffect, useCallback } from 'react'
import { useTerminalStore } from '../terminalStore'

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
