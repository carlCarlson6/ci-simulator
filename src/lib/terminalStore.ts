// src/lib/terminalStore.ts
import { create } from 'zustand'
import { FileSystem } from './fileSystem'
import { executeCommand, getCompletionCandidates } from './commands/index'

export type TerminalLine = {
  id: string
  type: 'prompt' | 'output' | 'error' | 'system'
  content: string
  timestamp: Date
}

type TerminalState = {
  lines: TerminalLine[]
  history: string[]
  currentPath: string
  previousPath: string
  fileSystem: FileSystem

  initialize: () => void
  executeCommand: (input: string) => void
  clearScreen: () => void
  getPrompt: () => string
  getCompletionCandidates: (input: string) => string[]
  addLine: (line: Omit<TerminalLine, 'id' | 'timestamp'>) => void
}

let lineId = 0
const generateId = () => `line-${++lineId}`

export const useTerminalStore = create<TerminalState>((set, get) => ({
  lines: [],
  history: [],
  currentPath: '/home/user',
  previousPath: '/home/user',
  fileSystem: new FileSystem(),

  initialize: () => {
    const fs = new FileSystem()
    fs.initializeDefaults()

    set({
      fileSystem: fs,
      lines: [],
      history: [],
      currentPath: '/home/user',
      previousPath: '/home/user',
    })

    const motd = fs.readFile('/etc/motd')
    if (motd) {
      get().addLine({ type: 'system', content: motd })
    }
  },

  executeCommand: (input: string) => {
    const state = get()
    const trimmed = input.trim()

    if (trimmed === '') {
      get().addLine({ type: 'prompt', content: get().getPrompt() })
      return
    }

    // Show the prompt + command in output
    get().addLine({ type: 'prompt', content: get().getPrompt() + ' ' + trimmed })

    // Execute with current history (command not yet recorded)
    const result = executeCommand(trimmed, {
      fileSystem: state.fileSystem,
      currentPath: state.currentPath,
      previousPath: state.previousPath,
      history: state.history,
    })

    // Record command in history AFTER execution
    set({ history: [...state.history, trimmed] })

    // Handle special commands
    const command = trimmed.split(/\s+/)[0]

    if (command === 'clear') {
      get().clearScreen()
      return
    }

    if (command === 'cd' && result.success) {
      const newPath = result.data?.newPath || state.currentPath
      set({ currentPath: newPath, previousPath: state.currentPath })
    }

    // Handle curl asynchronously
    if (command === 'curl' && result.success && result.data?.curlUrl) {
      fetch('/api/proxy-http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: result.data.curlUrl,
          method: result.data.curlMethod || 'GET',
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            get().addLine({ type: 'error', content: `curl: ${data.error}` })
            return
          }

          const lines: string[] = []
          lines.push(`HTTP/${data.status} ${data.statusText || 'OK'}`)

          if (data.headers) {
            for (const [key, value] of Object.entries(data.headers)) {
              if (value) lines.push(`${key}: ${value}`)
            }
          }

          lines.push('')

          if (data.body) {
            const bodyLines = String(data.body).split('\n')
            const maxLines = 100
            for (let i = 0; i < Math.min(bodyLines.length, maxLines); i++) {
              lines.push(bodyLines[i])
            }
            if (bodyLines.length > maxLines) {
              lines.push(`... (${bodyLines.length - maxLines} more lines)`)
            }
          }

          for (const line of lines) {
            get().addLine({ type: 'output', content: line })
          }
        })
        .catch((err) => {
          get().addLine({ type: 'error', content: `curl: ${err.message}` })
        })
      return
    }

    // Add output
    if (result.success) {
      if (result.data?.output) {
        for (const line of result.data.output.split('\n')) {
          get().addLine({ type: 'output', content: line })
        }
      }
    } else {
      get().addLine({ type: 'error', content: result.error || 'Unknown error' })
    }
  },

  clearScreen: () => {
    set({ lines: [] })
    get().addLine({ type: 'prompt', content: get().getPrompt() })
  },

  getPrompt: () => {
    const path = get().currentPath === '/home/user' ? '~' : get().currentPath
    return `user:${path}`
  },

  getCompletionCandidates: (input: string) => {
    const state = get()
    return getCompletionCandidates(input, {
      fileSystem: state.fileSystem,
      currentPath: state.currentPath,
    })
  },

  addLine: (line) => {
    set((state) => ({
      lines: [
        ...state.lines,
        {
          ...line,
          id: generateId(),
          timestamp: new Date(),
        },
      ],
    }))
  },
}))
