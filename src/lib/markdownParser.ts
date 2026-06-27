// src/lib/markdownParser.ts
// DIY Markdown Parser — emits React elements directly, zero XSS risk

import React from 'react'

// ─── Inline formatting (left-to-right processing) ───────────────────────────

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let remaining = text

  // Regex patterns for inline markers (process left-to-right, strongest first)
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

    // Add text before the match
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
        React.createElement('img', {
          key: nodes.length,
          src: url,
          alt: alt,
          className:
            'max-w-full h-auto my-2 block border border-terminal-green/20',
          onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
            const el = e.currentTarget
            el.style.display = 'none'
            const placeholder = document.createElement('span')
            placeholder.className = 'text-terminal-red italic'
            placeholder.textContent = `[IMAGE FAILED: ${alt}]`
            el.parentNode?.insertBefore(placeholder, el)
          },
        })
      )
    } else if (pattern.type === 'link') {
      const linkText = earliestMatch[1]
      const url = earliestMatch[2]
      nodes.push(
        React.createElement(
          'span',
          { key: nodes.length, className: 'text-terminal-cyan underline cursor-default' },
          linkText
        )
      )
      nodes.push(
        React.createElement(
          'span',
          { key: nodes.length + 1, className: 'text-terminal-green-dark ml-1' },
          `(${url})`
        )
      )
    }

    remaining = remaining.slice(earliestIndex + matchText.length)
  }

  return nodes
}

// ─── Block-level parsing ─────────────────────────────────────────────────────

export function markdownParser(content: string): React.ReactNode[] {
  if (!content.trim()) return []

  const rawLines = content.split('\n')

  // Pass 1: Identify block boundaries
  const blocks: string[][] = []
  let currentBlock: string[] = []
  let inCodeBlock = false

  for (const line of rawLines) {
    const trimmed = line.trimEnd()

    if (inCodeBlock) {
      if (trimmed === '```') {
        currentBlock.push(trimmed)
        blocks.push([...currentBlock])
        currentBlock = []
        inCodeBlock = false
      } else {
        currentBlock.push(line) // preserve original indentation
      }
      continue
    }

    if (trimmed === '```') {
      if (currentBlock.length > 0) {
        blocks.push([...currentBlock])
        currentBlock = []
      }
      currentBlock.push(trimmed)
      inCodeBlock = true
      continue
    }

    if (trimmed === '') {
      if (currentBlock.length > 0) {
        blocks.push([...currentBlock])
        currentBlock = []
      }
      continue
    }

    currentBlock.push(trimmed)
  }

  if (inCodeBlock && currentBlock.length > 0) {
    blocks.push(currentBlock) // unclosed code block
  } else if (currentBlock.length > 0) {
    blocks.push(currentBlock)
  }

  // Pass 2: Convert blocks to React elements
  const elements: React.ReactNode[] = []

  for (const block of blocks) {
    const firstLine = block[0]
    const rest = block.slice(1)

    // Fenced code block
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

    // Horizontal rule
    if (block.length === 1 && firstLine === '---') {
      elements.push(
        React.createElement('hr', {
          key: elements.length,
          className: 'border-terminal-green/30 my-4',
        })
      )
      continue
    }

    // Headers
    const headerMatch = firstLine.match(/^(#{1,3})\s+(.*)$/)
    if (headerMatch) {
      const level = headerMatch[1].length
      const text = headerMatch[2]
      const tag = `h${level}` as 'h1' | 'h2' | 'h3'
      const classMap = {
        h1: 'text-terminal-green text-xl font-bold mt-4 mb-2 border-b',
        h2: 'text-terminal-green text-lg font-bold mt-3 mb-2 border-b',
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

    // List items — group consecutive ones into a single <ul>
    const listItemMatch = firstLine.match(/^[\-*]\s+(.*)$/)
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
        const m = line.match(/^[\-*]\s+(.*)$/)
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

    // Blockquote
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

    // Paragraph (default)
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
