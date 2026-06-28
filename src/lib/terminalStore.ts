import { create } from 'zustand'
import { FileSystem, createFileSystemFromSerialized } from './fileSystem'
import { executeCommand, getCompletionCandidates, getCommandEffect } from './commands/index'
import { loadFileSystem } from './persistence'
import { persistState, syncToServerIfUser } from './sync'
import { getTheme } from './themes'
import { getPromptPrefix } from './auth'
import { ProcessManager } from './processManager'
import type { ServerStatePayload } from './serverStorage'

export type TerminalLine = {
  id: string
  type: 'prompt' | 'output' | 'error' | 'system'
  content: string
  timestamp: Date
}

export type UserInfo = {
  id: string
  email: string
  username: string
}

type AuthCallbacks = {
  openSignIn?: () => void
  signOut?: () => void
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
  user: string | null
  userInfo: UserInfo | null
  authCallbacks: AuthCallbacks
  processManager: ProcessManager
  shellPid: number
  sessionId: number

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
  setUser: (user: string | null) => void
  setUserInfo: (userInfo: UserInfo | null) => void
  setAuthCallbacks: (callbacks: AuthCallbacks) => void
  restoreServerState: (data: ServerStatePayload) => void
}

let lineId = 0
const generateId = () => `line-${++lineId}`

const initialPm = new ProcessManager()
const initialShellPid = initialPm.spawn(0, 'bash', [], true)

export const useTerminalStore = create<TerminalState>((set, get) => ({
  lines: [],
  history: [],
  currentPath: '/',
  previousPath: '/',
  fileSystem: new FileSystem(),
  currentTheme: 'cyberpunk',
  editorOpen: false,
  editorFilePath: null,
  editorContent: null,
  markdownOpen: false,
  markdownFilePath: null,
  markdownContent: null,
  envVars: {},
  user: null,
  userInfo: null,
  authCallbacks: {},
  processManager: initialPm,
  shellPid: initialShellPid,
  sessionId: initialShellPid,

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
      return
    }

    const isBackground = trimmed.endsWith(' &')
    const cmdText = isBackground ? trimmed.slice(0, -2).trimEnd() : trimmed

    get().addLine({ type: 'prompt', content: get().getPrompt() + ' ' + trimmed })

    const firstSpace = cmdText.indexOf(' ')
    const command = firstSpace === -1 ? cmdText : cmdText.slice(0, firstSpace)
    const argsStr = firstSpace === -1 ? '' : cmdText.slice(firstSpace + 1)
    const args = argsStr ? argsStr.split(/\s+/) : []

    const pid = state.processManager.spawn(
      state.shellPid, command, args, !isBackground
    )

    const result = executeCommand(cmdText, {
      fileSystem: state.fileSystem,
      currentPath: state.currentPath,
      previousPath: state.previousPath,
      history: state.history,
      currentTheme: state.currentTheme,
      setTheme: get().setTheme,
      envVars: state.envVars,
      user: state.user,
      processManager: state.processManager,
      sessionId: state.sessionId,
      pid,
    })

    state.processManager.setExit(pid, result.success ? 0 : 1)

    set({ history: [...state.history, trimmed] })

    const cmdName = cmdText.split(/\s+/)[0]
    const effect = getCommandEffect(cmdName)

    if (effect) {
      const outcome = effect(result, {
        fileSystem: state.fileSystem,
        currentPath: state.currentPath,
        previousPath: state.previousPath,
        addLine: (type, content) => get().addLine({ type, content }),
        setPaths: (current, previous) => {
          set({ currentPath: current, previousPath: previous })
        },
        clearScreen: () => get().clearScreen(),
        openEditor: (filePath, content) => get().openEditor(filePath, content),
        closeEditor: () => get().closeEditor(),
        openMarkdown: (filePath, content) => get().openMarkdown(filePath, content),
        closeMarkdown: () => get().closeMarkdown(),
        envVars: state.envVars,
        setEnvVar: (key, value) => get().setEnvVar(key, value),
      })
      if (outcome === 'handled') {
        if (!isBackground) {
          get().addLine({ type: 'prompt', content: get().getPrompt() })
        } else {
          get().addLine({ type: 'output', content: `[${pid}] ${pid}` })
          get().addLine({ type: 'prompt', content: get().getPrompt() })
        }
        const st = get()
        persistState(st.fileSystem, st.currentPath, st.currentTheme, st.envVars)
        syncToServerIfUser(st.user).catch(() => {})
        return
      }
    }

    if (result.success) {
      if (result.data?.output) {
        for (const line of result.data.output.split('\n')) {
          get().addLine({ type: 'output', content: line })
        }
      }
    } else {
      get().addLine({ type: 'error', content: result.error || 'Unknown error' })
    }

    if (isBackground && result.success) {
      get().addLine({ type: 'output', content: `[${pid}] ${pid}` })
    }

    get().addLine({ type: 'prompt', content: get().getPrompt() })

    const st = get()
    persistState(st.fileSystem, st.currentPath, st.currentTheme, st.envVars)
    syncToServerIfUser(st.user).catch(() => { get().addLine({ type: 'error', content: 'State could not be saved to server.' }) })
  },

  clearScreen: () => {
    set({ lines: [] })
    get().addLine({ type: 'prompt', content: get().getPrompt() })
  },

  getPrompt: () => {
    const path = get().currentPath === '/' ? '~' : get().currentPath
    const prefix = getPromptPrefix(get().user)
    return `${prefix}:${path}`
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
    const st = get()
    if (st.editorFilePath) {
      st.fileSystem.writeFile(st.editorFilePath, content)
      persistState(st.fileSystem, st.currentPath, st.currentTheme, st.envVars)
      syncToServerIfUser(st.user).catch(() => { get().addLine({ type: 'error', content: 'State could not be saved to server.' }) })
    }
    set({
      editorOpen: false,
      editorFilePath: null,
      editorContent: null,
    })
    get().addLine({ type: 'output', content: `Saved ${st.editorFilePath}` })
    get().addLine({ type: 'prompt', content: get().getPrompt() })
  },

  setEnvVar: (key: string, value: string) => {
    set((state) => ({
      envVars: { ...state.envVars, [key]: value },
    }))
  },

  setUser: (user: string | null) => {
    set({ user })
  },

  setUserInfo: (userInfo: UserInfo | null) => {
    set({ userInfo })
  },

  setAuthCallbacks: (callbacks: AuthCallbacks) => {
    set({ authCallbacks: callbacks })
  },

  restoreServerState: (data: ServerStatePayload) => {
    const fileSystem = createFileSystemFromSerialized(data.fileSystem)
    persistState(fileSystem, data.currentPath, data.theme, data.envVars)

    set({
      fileSystem,
      currentPath: data.currentPath,
      previousPath: data.currentPath,
      currentTheme: data.theme,
      envVars: data.envVars,
    })

    get().addLine({ type: 'system', content: 'State restored from server.' })
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
