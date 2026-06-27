import { CommandContext, CommandResult, CommandHandler } from './types'

import { handler as helpHandler } from './help'
import { handler as clearHandler } from './clear'
import { handler as lsHandler } from './ls'
import { handler as cdHandler } from './cd'
import { handler as pwdHandler } from './pwd'
import { handler as catHandler } from './cat'
import { handler as echoHandler } from './echo'
import { handler as mkdirHandler } from './mkdir'
import { handler as touchHandler } from './touch'
import { handler as rmHandler } from './rm'
import { handler as cpHandler } from './cp'
import { handler as mvHandler } from './mv'
import { handler as curlHandler } from './curl'
import { handler as manHandler } from './man'
import { handler as cowsayHandler } from './cowsay'
import { handler as historyHandler } from './history'
import { handler as themeHandler } from './theme'

const commands: Record<string, CommandHandler> = {
  help: helpHandler,
  clear: clearHandler,
  ls: lsHandler,
  cd: cdHandler,
  pwd: pwdHandler,
  cat: catHandler,
  echo: echoHandler,
  mkdir: mkdirHandler,
  touch: touchHandler,
  rm: rmHandler,
  cp: cpHandler,
  mv: mvHandler,
  curl: curlHandler,
  man: manHandler,
  cowsay: cowsayHandler,
  history: historyHandler,
  theme: themeHandler,
}

export type { CommandContext, CommandResult, CommandHandler } from './types'

export function executeCommand(input: string, context: CommandContext): CommandResult {
  const parts = input.trim().split(/\s+/)
  const command = parts[0]
  const args = parts.slice(1)

  const handler = commands[command]
  if (!handler) {
    return { success: false, error: `${command}: command not found` }
  }

  return handler(args, context)
}

export function getCompletionCandidates(
  input: string,
  context: Pick<CommandContext, 'fileSystem' | 'currentPath'>
): string[] {
  const parts = input.trim().split(/\s+/)

  if (parts.length <= 1) {
    const partial = parts[0] || ''
    return Object.keys(commands).filter((cmd) => cmd.startsWith(partial))
  }

  const partial = parts[parts.length - 1]
  const resolved = context.fileSystem.resolvePath(partial, context.currentPath)

  let dir: string
  let prefix: string

  if (partial.endsWith('/')) {
    dir = resolved
    prefix = ''
  } else {
    dir = context.fileSystem.getParent(resolved)
    prefix = context.fileSystem.getName(resolved)
  }

  try {
    const entries = context.fileSystem.listDirectory(dir)
    const candidates = entries.filter((entry) => entry.startsWith(prefix))

    return candidates.map((entry) => {
      const fullPath = dir === '/' ? '/' + entry : dir + '/' + entry
      return context.fileSystem.getEntry(fullPath)?.type === 'directory' ? entry + '/' : entry
    })
  } catch {
    return []
  }
}

export function getCommands(): string[] {
  return Object.keys(commands)
}
