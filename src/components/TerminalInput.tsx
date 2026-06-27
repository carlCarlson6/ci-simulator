// src/components/TerminalInput.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useTerminalStore } from '../lib/terminalStore'

export function TerminalInput() {
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  const executeCommand = useTerminalStore((state) => state.executeCommand)
  const clearScreen = useTerminalStore((state) => state.clearScreen)
  const getPrompt = useTerminalStore((state) => state.getPrompt)
  const history = useTerminalStore((state) => state.history)
  const getCompletionCandidates = useTerminalStore((state) => state.getCompletionCandidates)
  const addLine = useTerminalStore((state) => state.addLine)

  const prompt = getPrompt()

  // Auto focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // Auto-resize textarea as content grows (multiline input)
  useEffect(() => {
    const el = inputRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [input])

  const handleSubmit = useCallback(() => {
    if (input.trim()) {
      executeCommand(input)
    }
    setInput('')
    setHistoryIndex(-1)
  }, [input, executeCommand])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (!e.shiftKey) {
          e.preventDefault()
          handleSubmit()
        }
        // Shift+Enter falls through: default textarea behavior inserts newline
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (history.length > 0) {
          const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
          setHistoryIndex(newIndex)
          setInput(history[newIndex] || '')
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (historyIndex !== -1) {
          const newIndex = historyIndex + 1
          if (newIndex >= history.length) {
            setHistoryIndex(-1)
            setInput('')
          } else {
            setHistoryIndex(newIndex)
            setInput(history[newIndex] || '')
          }
        }
      } else if (e.key === 'Tab') {
        e.preventDefault()
        const candidates = getCompletionCandidates(input)
        if (candidates.length > 0) {
          const completion = candidates[0]
          const parts = input.split(/\s+/)
          if (parts.length <= 1) {
            setInput(completion + ' ')
          } else {
            parts[parts.length - 1] = completion
            setInput(parts.join(' '))
          }
        }
      } else if (e.key === 'c' && e.ctrlKey) {
        e.preventDefault()
        addLine({ type: 'output', content: '^C' })
        addLine({ type: 'prompt', content: getPrompt() })
        setInput('')
        setHistoryIndex(-1)
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault()
        clearScreen()
      }
    },
    [input, history, historyIndex, handleSubmit, getCompletionCandidates, clearScreen, addLine, getPrompt]
  )

  // Focus input on click anywhere in terminal
  useEffect(() => {
    const handleClick = () => {
      inputRef.current?.focus()
    }
    const terminal = terminalRef.current
    if (terminal) {
      terminal.addEventListener('click', handleClick)
      return () => terminal.removeEventListener('click', handleClick)
    }
  }, [])

  // Re-focus input when window regains focus
  useEffect(() => {
    const handleWindowFocus = () => {
      inputRef.current?.focus()
    }
    window.addEventListener('focus', handleWindowFocus)
    return () => window.removeEventListener('focus', handleWindowFocus)
  }, [])

  return (
    <div
      ref={terminalRef}
      className="flex items-center w-full bg-terminal-bg border-t border-terminal-green-dark/30"
    >
      <span className="whitespace-nowrap mr-2 terminal-glow select-none shrink-0">
        <span className="text-terminal-green font-bold">user</span>
        <span className="text-terminal-green-dark">:</span>
        <span className="text-terminal-green-dark">{prompt.split(':')[1]}</span>
      </span>
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        className="flex-1 bg-transparent text-terminal-green font-mono text-sm outline-none border-none ring-0 focus:ring-0 focus:outline-none terminal-input terminal-glow min-h-[1.5em] py-0.5"
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        style={{ caretColor: '#00ff00', resize: 'none', overflow: 'hidden' }}
      />
    </div>
  )
}
