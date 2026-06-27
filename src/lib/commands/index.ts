import { CommandContext, CommandResult, CommandHandler, CommandEffect } from './types'

import { handler as helpHandler } from './help'
import { handler as clearHandler, effect as clearEffect } from './clear'
import { handler as lsHandler } from './ls'
import { handler as treeHandler } from './tree'
import { handler as gtreeHandler } from './gtree'
import { handler as cdHandler, effect as cdEffect } from './cd'
import { handler as pwdHandler } from './pwd'
import { handler as catHandler } from './cat'
import { handler as echoHandler } from './echo'
import { handler as mkdirHandler } from './mkdir'
import { handler as touchHandler } from './touch'
import { handler as rmHandler } from './rm'
import { handler as cpHandler } from './cp'
import { handler as mvHandler } from './mv'
import { handler as curlHandler, effect as curlEffect } from './curl'
import { handler as manHandler } from './man'
import { handler as cowsayHandler } from './cowsay'
import { handler as historyHandler } from './history'
import { handler as themeHandler } from './theme'
import { handler as editHandler, effect as editEffect } from './edit'
import { handler as mdHandler, effect as mdEffect } from './md'
import { handler as envHandler } from './env'
import { handler as exportHandler, effect as exportEffect } from './export'
import { handler as loginHandler } from './login'
import { handler as logoutHandler } from './logout'
import { handler as whoamiHandler } from './whoami'

const commands: Record<string, CommandHandler> = {
  help: helpHandler,
  clear: clearHandler,
  ls: lsHandler,
  tree: treeHandler,
  gtree: gtreeHandler,
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
  edit: editHandler,
  md: mdHandler,
  env: envHandler,
  export: exportHandler,
  login: loginHandler,
  logout: logoutHandler,
  whoami: whoamiHandler,
}

const commandEffects: Record<string, CommandEffect> = {
  clear: clearEffect,
  cd: cdEffect,
  curl: curlEffect,
  edit: editEffect,
  md: mdEffect,
  export: exportEffect,
}

export type { CommandContext, CommandResult, CommandHandler, CommandEffect, CommandEffectContext } from './types'

export function expandVariables(input: string, envVars: Record<string, string>): string {
  return input.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, key) => envVars[key] ?? '')
}

export function executeCommand(input: string, context: CommandContext): CommandResult {
  const trimmed = input.trim()
  const firstSpace = trimmed.indexOf(' ')
  let command: string
  let args: string[]

  if (firstSpace === -1) {
    command = trimmed
    args = []
  } else {
    command = trimmed.slice(0, firstSpace)
    const argsStr = trimmed.slice(firstSpace + 1)
    const expanded = expandVariables(argsStr, context.envVars)
    args = expanded.split(/\s+/)
  }

  const handler = commands[command]
  if (!handler) {
    return { success: false, error: `${command}: command not found` }
  }

  return handler(args, context)
}

export function getCompletionCandidates(
  input: string,
  context: Pick<CommandContext, 'fileSystem' | 'currentPath' | 'envVars'>
): string[] {
  const parts = input.trim().split(/\s+/)

  if (parts.length <= 1) {
    const partial = parts[0] || ''
    return Object.keys(commands).filter((cmd) => cmd.startsWith(partial))
  }

  const command = parts[0]

  if (command === 'env' && parts.length === 2) {
    const partial = parts[1]
    return Object.keys(context.envVars).filter((key) => key.startsWith(partial))
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

export function getCommandEffect(command: string): CommandEffect | undefined {
  return commandEffects[command]
}

export function getCommands(): string[] {
  return Object.keys(commands)
}
