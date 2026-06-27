// src/lib/terminalStore.ts
import { create } from 'zustand'
import { FileSystem, createFileSystemFromSerialized } from './fileSystem'
import { executeCommand, getCompletionCandidates, getCommandEffect } from './commands/index'
import { saveFileSystem, loadFileSystem, clearFileSystemStorage } from './persistence'
import { getTheme } from './themes'

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
  currentTheme: string

  initialize: () => void
  executeCommand: (input: string) => void
  clearScreen: () => void
  getPrompt: () => string
  getCompletionCandidates: (input: string) => string[]
  addLine: (line: Omit<TerminalLine, 'id' | 'timestamp'>) => void
  setTheme: (name: string) => void
}

let lineId = 0
const generateId = () => `line-${++lineId}`

export const useTerminalStore = create<TerminalState>((set, get) => ({
  lines: [],
  history: [],
  currentPath: '/home/user',
  previousPath: '/home/user',
  fileSystem: new FileSystem(),
  currentTheme: 'cyberpunk',

  initialize: () => {
    const stored = loadFileSystem()
    const fs = stored ? createFileSystemFromSerialized(stored) : new FileSystem()
    if (!stored) {
      fs.initializeDefaults()
    }

    const startPath = fs.isDirectory('/home/user') ? '/home/user' : '/'

    const savedTheme = localStorage.getItem('ci-simulator:theme')
    const initialTheme = savedTheme && getTheme(savedTheme) ? savedTheme : 'cyberpunk'

    set({
      fileSystem: fs,
      lines: [],
      history: [],
      currentPath: startPath,
      previousPath: startPath,
      currentTheme: initialTheme,
    })

    try {
      const motd = fs.readFile('/etc/motd')
      if (motd) {
        get().addLine({ type: 'system', content: motd })
      }
    } catch {
      // /etc/motd not found, skip
    }
  },

  executeCommand: (input: string) => {
    const state = get()
    const trimmed = input.trim()

    if (trimmed === '') {
      get().addLine({ type: 'prompt', content: get().getPrompt() })
      saveFileSystem(state.fileSystem)
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
      currentTheme: state.currentTheme,
      setTheme: get().setTheme,
    })

    // Record command in history AFTER execution
    set({ history: [...state.history, trimmed] })

    const command = trimmed.split(/\s+/)[0]
    const effect = getCommandEffect(command)

    if (effect) {
      const outcome = effect(result, {
        fileSystem: state.fileSystem,
        currentPath: state.currentPath,
        previousPath: state.previousPath,
        addLine: (type, content) => get().addLine({ type, content }),
        setPaths: (current, previous) => set({ currentPath: current, previousPath: previous }),
        clearScreen: () => get().clearScreen(),
        saveFileSystem: (fs) => saveFileSystem(fs),
      })

      if (outcome === 'handled') {
        saveFileSystem(get().fileSystem)
        return
      }
    }

    // Default output handling
    if (result.success) {
      if (result.data?.output) {
        for (const line of result.data.output.split('\n')) {
          get().addLine({ type: 'output', content: line })
        }
      }
    } else {
      get().addLine({ type: 'error', content: result.error || 'Unknown error' })
    }

    // Auto-save filesystem state after every command
    saveFileSystem(get().fileSystem)
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

  setTheme: (name: string) => {
    const theme = getTheme(name)
    if (!theme) return
    set({ currentTheme: name })
    localStorage.setItem('ci-simulator:theme', name)
  },
}))
