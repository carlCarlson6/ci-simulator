// src/lib/commands.ts
import { FileSystem } from './fileSystem'

export type CommandContext = {
  fileSystem: FileSystem
  currentPath: string
  previousPath: string
  history: string[]
  serverInfo: {
    hostname: string
    username: string
    date: string
    platform: string
    release: string
  } | null
}

export type CommandResult = {
  success: boolean
  error?: string
  data?: {
    output?: string
    newPath?: string
  }
}

export type CommandHandler = (args: string[], context: CommandContext) => CommandResult

const commands: Record<string, CommandHandler> = {
  help: (_args, _context) => {
    const output = [
      'Cyberpunk Terminal Simulator - Available Commands',
      '',
      'File System Commands:',
      '  ls [path]        List directory contents',
      '  cd <path>        Change directory',
      '  pwd              Print working directory',
      '  cat <file>       Display file contents',
      '  mkdir <dir>      Create directory',
      '  touch <file>     Create empty file',
      '  rm [-r] <target> Remove file or directory',
      '',
      'System Commands:',
      '  whoami           Display current user (server)',
      '  date             Display current date (server)',
      '  hostname         Display system hostname (server)',
      '  neofetch         Display system info with ASCII art',
      '',
      'General Commands:',
      '  help             Show this help message',
      '  clear            Clear terminal screen',
      '  echo <text>      Print text',
      '  history          Show command history',
      '',
      'Navigation Tips:',
      '  Use Up/Down arrows for command history',
      '  Use Tab for command and file completion',
      '  cd ~ or cd       Go to home directory',
      '  cd -             Go to previous directory',
    ].join('\n')

    return { success: true, data: { output } }
  },

  clear: (_args, _context) => {
    return { success: true, data: {} }
  },

  ls: (args, context) => {
    const path = args[0] || context.currentPath
    try {
      const resolved = context.fileSystem.resolvePath(path, context.currentPath)
      const entries = context.fileSystem.listDirectory(resolved)
      
      if (entries.length === 0) {
        return { success: true, data: { output: '' } }
      }

      const formatted = entries.map((name) => {
        const fullPath = resolved === '/' ? '/' + name : resolved + '/' + name
        const entry = context.fileSystem.getEntry(fullPath)
        if (entry?.type === 'directory') {
          return `${name}/`
        }
        return name
      })

      return { success: true, data: { output: formatted.join('\n') } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  cd: (args, context) => {
    if (args.length === 0 || args[0] === '~') {
      return { success: true, data: { newPath: '/home/user' } }
    }

    if (args[0] === '-') {
      return { success: true, data: { newPath: context.previousPath } }
    }

    try {
      const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
      const entry = context.fileSystem.getEntry(resolved)

      if (!entry) {
        return { success: false, error: `cd: no such file or directory: ${args[0]}` }
      }

      if (entry.type !== 'directory') {
        return { success: false, error: `cd: not a directory: ${args[0]}` }
      }

      return { success: true, data: { newPath: resolved } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  pwd: (_args, context) => {
    return { success: true, data: { output: context.currentPath } }
  },

  cat: (args, context) => {
    if (args.length === 0) {
      return { success: false, error: 'cat: missing file operand' }
    }

    try {
      const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
      const content = context.fileSystem.readFile(resolved)
      return { success: true, data: { output: content } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  echo: (args, _context) => {
    return { success: true, data: { output: args.join(' ') } }
  },

  mkdir: (args, context) => {
    if (args.length === 0) {
      return { success: false, error: 'mkdir: missing operand' }
    }

    try {
      const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
      context.fileSystem.createDirectory(resolved)
      return { success: true, data: { output: '' } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  touch: (args, context) => {
    if (args.length === 0) {
      return { success: false, error: 'touch: missing file operand' }
    }

    try {
      const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
      if (context.fileSystem.exists(resolved)) {
        // Update modified time
        const entry = context.fileSystem.getEntry(resolved)
        if (entry) {
          entry.modifiedAt = new Date()
        }
      } else {
        context.fileSystem.createFile(resolved)
      }
      return { success: true, data: { output: '' } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  rm: (args, context) => {
    if (args.length === 0) {
      return { success: false, error: 'rm: missing operand' }
    }

    const recursive = args.includes('-r') || args.includes('-rf')
    const targets = args.filter((arg) => !arg.startsWith('-'))

    const errors: string[] = []

    for (const target of targets) {
      try {
        const resolved = context.fileSystem.resolvePath(target, context.currentPath)

        // Easter egg: rm -rf /
        if (resolved === '/' && recursive) {
          errors.push('rm: it is dangerous to operate recursively on \'/\'')
          errors.push('rm: are you sure you want to do this?')
          errors.push('rm: operation cancelled')
          continue
        }

        context.fileSystem.removeEntry(resolved, recursive)
      } catch (error) {
        errors.push((error as Error).message)
      }
    }

    if (errors.length > 0) {
      return { success: false, error: errors.join('\n') }
    }

    return { success: true, data: { output: '' } }
  },

  whoami: (_args, context) => {
    const username = context.serverInfo?.username || 'user'
    return { success: true, data: { output: username } }
  },

  date: (_args, context) => {
    const date = context.serverInfo?.date
      ? new Date(context.serverInfo.date).toString()
      : new Date().toString()
    return { success: true, data: { output: date } }
  },

  hostname: (_args, context) => {
    const hostname = context.serverInfo?.hostname || 'localhost'
    return { success: true, data: { output: hostname } }
  },

  history: (_args, context) => {
    if (context.history.length === 0) {
      return { success: true, data: { output: 'No commands in history' } }
    }
    const lines = context.history.map((cmd, index) => {
      const num = String(index + 1).padStart(4, ' ')
      return `${num}  ${cmd}`
    })
    return { success: true, data: { output: lines.join('\n') } }
  },

  neofetch: (_args, context) => {
    const info = context.serverInfo
    const ascii = [
      '       ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄',
      '     ▄▀                      ▀▄',
      '    ▄█  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄  █▄',
      '   ▄█  █                    █  █▄',
      '  ▄█   █  ██  ██  ██  ██   █   █▄',
      ' ▄█    █  ██  ██  ██  ██    █    █▄',
      ' █     █  ██  ██  ██  ██    █     █',
      ' █     █  ██  ██  ██  ██    █     █',
      ' ▀▄    █  ██  ██  ██  ██    █    ▄▀',
      '  ▀▄   █  ██  ██  ██  ██   █   ▄▀',
      '   ▀▄  █                    █  ▄▀',
      '    ▀▄ ▀▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▀ ▄▀',
      '      ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀',
    ]

    const infoLines = [
      `OS: Cyberpunk Terminal OS 1.0`,
      `Host: ${info?.hostname || 'localhost'}`,
      `Kernel: ${info?.platform || 'unknown'} ${info?.release || 'unknown'}`,
      `Uptime: ${Math.floor((Date.now() - (window as any).__START_TIME || Date.now()) / 1000)}s`,
      `Shell: cts (cyberpunk terminal shell)`,
      `Resolution: ${window.innerWidth}x${window.innerHeight}`,
      `DE: None`,
      `WM: Browser`,
      `Theme: Matrix`,
      `Icons: Neon`,
      `Terminal: Cyberpunk Terminal`,
      `CPU: Simulated Neural Processor`,
      `Memory: 64TB DDR7`,
    ]

    const output: string[] = []
    const maxLines = Math.max(ascii.length, infoLines.length)

    for (let i = 0; i < maxLines; i++) {
      const artLine = ascii[i] || ' '.repeat(30)
      const infoLine = infoLines[i] || ''
      output.push(`${artLine}  ${infoLine}`)
    }

    return { success: true, data: { output: output.join('\n') } }
  },
}

export function executeCommand(
  input: string,
  context: CommandContext
): CommandResult {
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
  context: Pick<CommandContext, 'fileSystem' | 'currentPath' | 'history'>
): string[] {
  const parts = input.trim().split(/\s+/)
  
  if (parts.length <= 1) {
    // Complete command names
    const partial = parts[0] || ''
    return Object.keys(commands).filter((cmd) => cmd.startsWith(partial))
  }

  // Complete file paths for the last argument
  const command = parts[0]
  const partial = parts[parts.length - 1]
  const resolved = context.fileSystem.resolvePath(partial, context.currentPath)
  
  // Get the directory part of the partial path
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
      const entryObj = context.fileSystem.getEntry(fullPath)
      if (entryObj?.type === 'directory') {
        return entry + '/'
      }
      return entry
    })
  } catch {
    return []
  }
}

export function getCommands(): string[] {
  return Object.keys(commands)
}
