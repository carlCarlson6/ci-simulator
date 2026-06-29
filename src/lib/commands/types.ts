import { FileSystem } from '../fileSystem'
import type { Task, TaskOp } from '../tasks'

export type CommandContext = {
  fileSystem: FileSystem
  currentPath: string
  previousPath: string
  history: string[]
  currentTheme: string
  setTheme: (name: string) => void
  envVars: Record<string, string>
  user?: string | null
  tasks: Task[]
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
    publishPageName?: string
    listPages?: boolean
    openTasksModal?: boolean
    taskOp?: TaskOp
    openNotesModal?: boolean
    notesMkdirPath?: string
    notesRemovePath?: string
  }
}

export type CommandEffectContext = {
  fileSystem: FileSystem
  currentPath: string
  previousPath: string
  addLine: (type: 'prompt' | 'output' | 'error' | 'system', content: string) => void
  setPaths: (current: string, previous: string) => void
  clearScreen: () => void
  openEditor: (filePath: string, content: string) => void
  closeEditor: () => void
  openMarkdown: (filePath: string, content: string) => void
  closeMarkdown: () => void
  envVars: Record<string, string>
  setEnvVar: (key: string, value: string) => void
  openTasks: () => void
  applyTaskOp: (op: TaskOp) => string
  openNotes: () => void
  notesMkdir: (path: string) => { ok: boolean; message: string }
  notesRemove: (path: string) => { ok: boolean; message: string }
}

export type CommandEffect = (
  result: CommandResult,
  context: CommandEffectContext
) => 'handled' | 'continue'

export type CommandHandler = (args: string[], context: CommandContext) => CommandResult
