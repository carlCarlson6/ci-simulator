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
  historyIndex: number
  currentPath: string
  previousPath: string
  completionCandidates: string[]
  completionIndex: number
  serverInfo: {
    hostname: string
    username: string
    date: string
    platform: string
    release: string
  } | null
  fileSystem: FileSystem

  // Actions
  initialize: () => void
  executeCommand: (input: string) => void
  clearScreen: () => void
  setHistoryIndex: (index: number) => void
  setCurrentPath: (path: string) => void
  getPrompt: () => string
  getCompletionCandidates: (input: string) => string[]
  cycleCompletion: (input: string) => string | null
  addLine: (line: Omit<TerminalLine, 'id' | 'timestamp'>) => void
}

let lineId = 0

const generateId = () => `line-${++lineId}`

export const useTerminalStore = create<TerminalState>((set, get) => ({
  lines: [],
  history: [],
  historyIndex: -1,
  currentPath: '/home/user',
  previousPath: '/home/user',
  completionCandidates: [],
  completionIndex: -1,
  serverInfo: null,
  fileSystem: new FileSystem(),

  initialize: () => {
    const fs = new FileSystem()
    fs.initializeDefaults()
    
    // Fetch server info from API
    fetch('/api/system-info')
      .then((res) => res.json())
      .then((info) => {
        set({ serverInfo: info })
      })
      .catch(() => {
        // Fallback
        set({
          serverInfo: {
            hostname: 'localhost',
            username: 'user',
            date: new Date().toISOString(),
            platform: 'unknown',
            release: 'unknown',
          },
        })
      })

    set({
      fileSystem: fs,
      lines: [],
      history: [],
      historyIndex: -1,
      currentPath: '/home/user',
      previousPath: '/home/user',
    })

    // Add initial MOTD
    const motd = fs.readFile('/etc/motd')
    if (motd) {
      get().addLine({ type: 'system', content: motd })
    }

    // Add initial prompt
    get().addLine({ type: 'prompt', content: get().getPrompt() })
  },

  executeCommand: (input: string) => {
    const state = get()
    const trimmed = input.trim()

    if (trimmed === '') {
      // Just add a new prompt
      get().addLine({ type: 'prompt', content: get().getPrompt() })
      return
    }

    // Add the command line to output
    const promptLine = get().getPrompt() + ' ' + trimmed
    get().addLine({ type: 'prompt', content: promptLine })

    // Add to history
    const newHistory = [...state.history, trimmed]
    set({ history: newHistory, historyIndex: -1 })

    // Execute
    const results = executeCommand(trimmed, {
      fileSystem: state.fileSystem,
      currentPath: state.currentPath,
      previousPath: state.previousPath,
      history: newHistory,
      serverInfo: state.serverInfo,
    })

    // Handle special commands
    const parts = trimmed.split(/\s+/)
    const command = parts[0]

    if (command === 'clear') {
      get().clearScreen()
      return
    }

    if (command === 'cd' && results.success) {
      const newPath = results.data?.newPath || state.currentPath
      const oldPath = state.currentPath
      set({ currentPath: newPath, previousPath: oldPath })
    }

    // Add output
    if (results.success) {
      if (results.data?.output) {
        const lines = results.data.output.split('\n')
        for (const line of lines) {
          get().addLine({ type: 'output', content: line })
        }
      }
    } else {
      get().addLine({ type: 'error', content: results.error || 'Unknown error' })
    }

    // Add new prompt
    get().addLine({ type: 'prompt', content: get().getPrompt() })
  },

  clearScreen: () => {
    set({ lines: [] })
    get().addLine({ type: 'prompt', content: get().getPrompt() })
  },

  setHistoryIndex: (index: number) => {
    set({ historyIndex: index })
  },

  setCurrentPath: (path: string) => {
    set({ currentPath: path })
  },

  getPrompt: () => {
    const state = get()
    const path = state.currentPath === '/home/user' ? '~' : state.currentPath
    return `user:${path}`
  },

  getCompletionCandidates: (input: string) => {
    const state = get()
    return getCompletionCandidates(input, {
      fileSystem: state.fileSystem,
      currentPath: state.currentPath,
      history: state.history,
    })
  },

  cycleCompletion: (input: string) => {
    const candidates = get().getCompletionCandidates(input)
    if (candidates.length === 0) return null

    const state = get()
    let newIndex = state.completionIndex + 1
    if (newIndex >= candidates.length) {
      newIndex = 0
    }

    set({ completionCandidates: candidates, completionIndex: newIndex })
    return candidates[newIndex]
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
