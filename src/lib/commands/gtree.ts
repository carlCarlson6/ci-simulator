import { CommandHandler } from './types'
import { renderFileSystemTree } from './utils'

export const MANUAL = 'gtree\n\nShow global directory tree from root.\n\nUsage: gtree'
export const HELP_TEXT = '  gtree                 Show global directory tree from root'

export const handler: CommandHandler = (_args, context) => {
  return {
    success: true,
    data: { output: renderFileSystemTree(context.fileSystem) },
  }
}
