import { FileSystem } from '../fileSystem'

export type CommandContext = {
  fileSystem: FileSystem
  currentPath: string
  previousPath: string
  history: string[]
}

export type CommandResult = {
  success: boolean
  error?: string
  data?: {
    output?: string
    newPath?: string
    curlUrl?: string
    curlMethod?: string
  }
}

export type CommandHandler = (args: string[], context: CommandContext) => CommandResult
