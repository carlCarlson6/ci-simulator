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
  editorOpen: boolean
  editorFilePath: string | null
  editorContent: string | null
  markdownOpen: boolean
  markdownFilePath: string | null
  markdownContent: string | null
  envVars: Record<string, string>

  initialize: () => void
  executeCommand: (input: string) => void
  clearScreen: () => void
  getPrompt: () => string
  getCompletionCandidates: (input: string) => string[]
  addLine: (line: Omit<TerminalLine, 'id' | 'timestamp'>) => void
  setTheme: (name: string) => void
  openEditor: (filePath: string, content: string) => void
  closeEditor: () => void
  saveEditor: (content: string) => void
  openMarkdown: (filePath: string, content: string) => void
  closeMarkdown: () => void
  setEnvVar: (key: string, value: string) => void
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
  editorOpen: false,
  editorFilePath: null,
  editorContent: null,
  markdownOpen: false,
  markdownFilePath: null,
  markdownContent: null,
  envVars: {},

  initialize: () => {
    const stored = loadFileSystem()
    const fileSystem = stored ? createFileSystemFromSerialized(stored) : new FileSystem()
    if (!stored) {
      fileSystem.initializeDefaults()
    }

    const savedPath = localStorage.getItem('ci-simulator:currentPath')
    let startPath = '/'
    if (savedPath && fileSystem.isDirectory(savedPath)) {
      startPath = savedPath
    } else if (fileSystem.isDirectory('/home/user')) {
      startPath = '/home/user'
    }

    const savedTheme = localStorage.getItem('ci-simulator:theme')
    const initialTheme = savedTheme && getTheme(savedTheme) ? savedTheme : 'cyberpunk'

    let envVars: Record<string, string> = {}
    try {
      const saved = localStorage.getItem('ci-simulator:envVars')
      if (saved) envVars = JSON.parse(saved)
    } catch { /* ignore corrupt data */ }

    set({
      fileSystem: fileSystem,
      lines: [],
      history: [],
      currentPath: startPath,
      previousPath: startPath,
      currentTheme: initialTheme,
      envVars,
    })

    try {
      const motd = fileSystem.readFile('/WELCOME_OUTPUT')
      if (motd) {
        get().addLine({ type: 'system', content: motd })
      }
    } catch {
      // /WELCOME_OUTPUT not found, skip
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
      envVars: state.envVars,
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
          setPaths: (current, previous) => {
            set({ currentPath: current, previousPath: previous })
            localStorage.setItem('ci-simulator:currentPath', current)
          },
          clearScreen: () => get().clearScreen(),
          saveFileSystem: (fs) => saveFileSystem(fs),
          openEditor: (filePath, content) => get().openEditor(filePath, content),
          closeEditor: () => get().closeEditor(),
          openMarkdown: (filePath, content) => get().openMarkdown(filePath, content),
          closeMarkdown: () => get().closeMarkdown(),
          envVars: state.envVars,
          setEnvVar: (key, value) => get().setEnvVar(key, value),
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
      envVars: state.envVars,
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

  openEditor: (filePath: string, content: string) => {
    set({
      editorOpen: true,
      editorFilePath: filePath,
      editorContent: content,
    })
  },

  closeEditor: () => {
    set({
      editorOpen: false,
      editorFilePath: null,
      editorContent: null,
    })
    get().addLine({ type: 'prompt', content: get().getPrompt() })
  },

  saveEditor: (content: string) => {
    const state = get()
    if (state.editorFilePath) {
      state.fileSystem.writeFile(state.editorFilePath, content)
      saveFileSystem(state.fileSystem)
    }
    set({
      editorOpen: false,
      editorFilePath: null,
      editorContent: null,
    })
    get().addLine({ type: 'output', content: `Saved ${state.editorFilePath}` })
    get().addLine({ type: 'prompt', content: get().getPrompt() })
  },

  setEnvVar: (key: string, value: string) => {
    set((state) => {
      const envVars = { ...state.envVars, [key]: value }
      localStorage.setItem('ci-simulator:envVars', JSON.stringify(envVars))
      return { envVars }
    })
  },

  openMarkdown: (filePath: string, content: string) => {
    set({
      markdownOpen: true,
      markdownFilePath: filePath,
      markdownContent: content,
    })
  },

  closeMarkdown: () => {
    set({
      markdownOpen: false,
      markdownFilePath: null,
      markdownContent: null,
    })
    get().addLine({ type: 'prompt', content: get().getPrompt() })
  },
}))
