import { FileSystem } from '../fileSystem'

export type CommandContext = {
  fileSystem: FileSystem
  currentPath: string
  previousPath: string
  history: string[]
  currentTheme: string
  setTheme: (name: string) => void
  envVars: Record<string, string>
  user?: string | null
}

export type CommandResult = {
  success: boolean
  error?: string
  data?: {
    output?: string
    newPath?: string
    curlUrl?: string
    curlMethod?: string
    editorFilePath?: string
    editorContent?: string
    markdownFilePath?: string
    markdownContent?: string
    exportVars?: Record<string, string>
  }
}

export type CommandEffectContext = {
  fileSystem: FileSystem
  currentPath: string
  previousPath: string
  addLine: (type: 'prompt' | 'output' | 'error' | 'system', content: string) => void
  setPaths: (current: string, previous: string) => void
  clearScreen: () => void
  saveFileSystem: (fs: FileSystem) => void
  openEditor: (filePath: string, content: string) => void
  closeEditor: () => void
  openMarkdown: (filePath: string, content: string) => void
  closeMarkdown: () => void
  envVars: Record<string, string>
  setEnvVar: (key: string, value: string) => void
}

export type CommandEffect = (
  result: CommandResult,
  context: CommandEffectContext
) => 'handled' | 'continue'

export type CommandHandler = (args: string[], context: CommandContext) => CommandResult
