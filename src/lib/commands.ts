// src/lib/commands.ts
import { FileSystem } from './fileSystem'

function renderFileSystemTree(fileSystem: FileSystem): string {
  const allPaths = fileSystem.getAllPaths()
  if (allPaths.length === 0) return ''

  interface TreeNode {
    name: string
    type: 'file' | 'directory'
    children: TreeNode[]
  }

  const root: TreeNode = { name: '/', type: 'directory', children: [] }

  for (const path of allPaths) {
    const parts = path.split('/').filter(Boolean)
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const fullPath = '/' + parts.slice(0, i + 1).join('/')
      const type = fileSystem.getEntry(fullPath)?.type || 'file'
      let child = current.children.find((c) => c.name === part)
      if (!child) {
        child = { name: part, type, children: [] }
        current.children.push(child)
      }
      current = child
    }
  }

  function renderNode(node: TreeNode, prefix: string = '', isLast: boolean = true): string {
    const connector = isLast ? '└── ' : '├── '
    const displayName = node.type === 'directory' ? `${node.name}/` : node.name
    let result = prefix + connector + displayName

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]
      const childIsLast = i === node.children.length - 1
      const childPrefix = prefix + (isLast ? '    ' : '│   ')
      result += '\n' + renderNode(child, childPrefix, childIsLast)
    }

    return result
  }

  let result = '/'
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i]
    const childIsLast = i === root.children.length - 1
    result += '\n' + renderNode(child, '', childIsLast)
  }

  return result
}

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
  }
}

export type CommandHandler = (args: string[], context: CommandContext) => CommandResult

const commands: Record<string, CommandHandler> = {
  help: () => ({
    success: true,
    data: {
      output: [
        'Terminal Simulator - Available Commands',
        '',
        '  ls [-w] [path]   List directory contents (-w: whole filesystem)',
        '  cd <path>        Change directory',
        '  pwd              Print working directory',
        '  cat <file>       Display file contents',
        '  mkdir <dir>      Create directory',
        '  touch <file>     Create empty file',
        '  rm [-r] <target> Remove file or directory',
        '  echo <text>      Print text',
        '  clear            Clear terminal screen',
        '  help             Show this help message',
      ].join('\n'),
    },
  }),

  clear: () => ({ success: true, data: {} }),

  ls: (args, context) => {
    const wholeFileSystem = args.includes('-w')
    const pathArg = args.find((arg) => !arg.startsWith('-'))

    if (wholeFileSystem) {
      return { success: true, data: { output: renderFileSystemTree(context.fileSystem) } }
    }

    const path = pathArg || context.currentPath
    try {
      const resolved = context.fileSystem.resolvePath(path, context.currentPath)
      const entries = context.fileSystem.listDirectory(resolved)

      if (entries.length === 0) {
        return { success: true, data: { output: '' } }
      }

      const formatted = entries.map((name) => {
        const fullPath = resolved === '/' ? '/' + name : resolved + '/' + name
        return context.fileSystem.getEntry(fullPath)?.type === 'directory' ? `${name}/` : name
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

  pwd: (_args, context) => ({
    success: true,
    data: { output: context.currentPath },
  }),

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

  echo: (args) => ({
    success: true,
    data: { output: args.join(' ') },
  }),

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
      if (!context.fileSystem.exists(resolved)) {
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
          errors.push("rm: it is dangerous to operate recursively on '/'")
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
}

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
