// src/lib/terminalStore.ts
import { create } from 'zustand'
import { FileSystem } from './fileSystem'
import { executeCommand, getCompletionCandidates } from './commands'

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
