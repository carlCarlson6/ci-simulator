// src/lib/commands.ts
import { FileSystem } from './fileSystem'

interface TreeNode {
  name: string
  type: 'file' | 'directory'
  children: TreeNode[]
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

function renderFileSystemTree(fileSystem: FileSystem): string {
  const allPaths = fileSystem.getAllPaths()
  if (allPaths.length === 0) return ''

  const root: TreeNode = { name: '/', type: 'directory', children: [] }

  for (const path of allPaths) {
    const parts = path.split('/').filter(Boolean)
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
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

  let result = '/'
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i]
    const childIsLast = i === root.children.length - 1
    result += '\n' + renderNode(child, '', childIsLast)
  }

  return result
}

function renderTreeFromPath(fileSystem: FileSystem, startPath: string): string {
  const allPaths = fileSystem.getAllPaths()
  const normalizedStart = fileSystem.resolvePath(startPath)
  const entry = fileSystem.getEntry(normalizedStart)
  if (!entry) {
    throw new Error(`ls: cannot access '${startPath}': No such file or directory`)
  }

  const filteredPaths = allPaths.filter(
    (p) => p === normalizedStart || p.startsWith(normalizedStart === '/' ? '' : normalizedStart + '/')
  )

  if (filteredPaths.length === 0) return normalizedStart

  const rootName = normalizedStart === '/' ? '/' : normalizedStart.split('/').pop() || normalizedStart
  const root: TreeNode = { name: rootName, type: 'directory', children: [] }

  for (const path of filteredPaths) {
    if (path === normalizedStart) continue
    const relative = path.slice(normalizedStart === '/' ? 1 : normalizedStart.length + 1)
    const parts = relative.split('/').filter(Boolean)
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const fullPath = normalizedStart + '/' + parts.slice(0, i + 1).join('/')
      const type = fileSystem.getEntry(fullPath)?.type || 'file'
      let child = current.children.find((c) => c.name === part)
      if (!child) {
        child = { name: part, type, children: [] }
        current.children.push(child)
      }
      current = child
    }
  }

  let result = rootName
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i]
    const childIsLast = i === root.children.length - 1
    result += '\n' + renderNode(child, '', childIsLast)
  }

  return result
}

function formatLsLong(fileSystem: FileSystem, path: string, name: string): string {
  const fullPath = path === '/' ? '/' + name : path + '/' + name
  const entry = fileSystem.getEntry(fullPath)
  if (!entry) return ''

  const perms = entry.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--'
  const size = entry.type === 'directory' ? '4096' : String((entry.content || '').length)
  const user = 'user'
  const group = 'user'
  const date = new Date().toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const displayName = entry.type === 'directory' ? name + '/' : name

  return `${perms}  ${user}  ${group}  ${size.padStart(6, ' ')}  ${date}  ${displayName}`
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
    curlUrl?: string
    curlMethod?: string
  }
}

export type CommandHandler = (args: string[], context: CommandContext) => CommandResult

const manPages: Record<string, string> = {
  help: 'help\n\nShow available commands and brief descriptions.\n\nUsage: help',
  clear: 'clear\n\nClear the terminal screen.\n\nUsage: clear',
  ls: 'ls\n\nList directory contents.\n\nUsage: ls [options] [path]\nOptions:\n  -a       Show hidden files\n  -l       Long format with permissions, size, date\n  -tree    Show directory tree from current (or given) path\n  -gtree   Show global directory tree from root',
  cd: 'cd\n\nChange the current directory.\n\nUsage: cd <path>\n  cd ~       Go to home directory\n  cd -       Go to previous directory',
  pwd: 'pwd\n\nPrint the current working directory.\n\nUsage: pwd',
  cat: 'cat\n\nDisplay file contents.\n\nUsage: cat <file>',
  echo: 'echo\n\nPrint text to the terminal.\n\nUsage: echo <text>',
  mkdir: 'mkdir\n\nCreate a directory.\n\nUsage: mkdir <directory>',
  touch: 'touch\n\nCreate an empty file or update its timestamp.\n\nUsage: touch <file>',
  rm: 'rm\n\nRemove files or directories.\n\nUsage: rm [-r] <target>\n  -r    Remove directories recursively',
  cp: 'cp\n\nCopy files or directories.\n\nUsage: cp [-r] <source> <destination>\n  -r    Copy directories recursively',
  mv: 'mv\n\nMove or rename files or directories.\n\nUsage: mv <source> <destination>',
  curl: 'curl\n\nTransfer data from or to a server.\n\nUsage: curl [options] <url>\n  -I    Fetch headers only (HEAD request)',
  man: 'man\n\nDisplay manual pages for commands.\n\nUsage: man <command>',
  cowsay: 'cowsay\n\nGenerate an ASCII cow with a speech bubble.\n\nUsage: cowsay [message]',
  history: 'history\n\nShow command history.\n\nUsage: history',
}

const commands: Record<string, CommandHandler> = {
  help: () => ({
    success: true,
    data: {
      output: [
        'Terminal Simulator - Available Commands',
        '',
        'File System Commands:',
        '  ls [-a] [-l] [-tree] [-gtree] [path]  List directory contents',
        '  cd <path>            Change directory',
        '  pwd                  Print working directory',
        '  cat <file>           Display file contents',
        '  mkdir <dir>           Create directory',
        '  touch <file>          Create empty file',
        '  rm [-r] <target>      Remove file or directory',
    '  cp [-r] <src> <dest>  Copy file or directory',
    '  mv <src> <dest>       Move or rename file or directory',
    '',
    'System Commands:',
    '  curl [-I] <url>       Make HTTP request',
        '',
        'General Commands:',
        '  help                  Show this help message',
        '  clear                 Clear terminal screen',
        '  echo <text>           Print text',
        '  history               Show command history',
        '  man <command>         Show manual page',
        '',
    'Fun Commands:',
    '  cowsay [message]      ASCII cow',
      ].join('\n'),
    },
  }),

  clear: () => ({ success: true, data: {} }),

  ls: (args, context) => {
    const showHidden = args.includes('-a') || args.includes('-la') || args.includes('-al')
    const longFormat = args.includes('-l') || args.includes('-la') || args.includes('-al')
    const treeLocal = args.includes('-tree')
    const treeGlobal = args.includes('-gtree')
    const pathArg = args.find((arg) => !arg.startsWith('-'))

    if (treeGlobal) {
      return {
        success: true,
        data: { output: renderFileSystemTree(context.fileSystem) },
      }
    }

    const path = pathArg || context.currentPath

    if (treeLocal) {
      try {
        const tree = renderTreeFromPath(context.fileSystem, path)
        return { success: true, data: { output: tree } }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }

    try {
      const resolved = context.fileSystem.resolvePath(path, context.currentPath)
      const entries = context.fileSystem.listDirectory(resolved)

      const filtered = showHidden ? entries : entries.filter((name) => !name.startsWith('.'))

      if (filtered.length === 0) {
        return { success: true, data: { output: '' } }
      }

      if (longFormat) {
        const formatted = filtered.map((name) => formatLsLong(context.fileSystem, resolved, name))
        return { success: true, data: { output: formatted.join('\n') } }
      }

      const formatted = filtered.map((name) => {
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

  cp: (args, context) => {
    const recursive = args.includes('-r')
    const targets = args.filter((arg) => !arg.startsWith('-'))

    if (targets.length < 2) {
      return { success: false, error: 'cp: missing file operand' }
    }

    const src = targets[0]
    const dest = targets[1]

    try {
      const srcResolved = context.fileSystem.resolvePath(src, context.currentPath)
      const destResolved = context.fileSystem.resolvePath(dest, context.currentPath)
      context.fileSystem.copyEntry(srcResolved, destResolved, recursive)
      return { success: true, data: { output: '' } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  mv: (args, context) => {
    if (args.length < 2) {
      return { success: false, error: 'mv: missing file operand' }
    }

    const src = args[0]
    const dest = args[1]

    try {
      const srcResolved = context.fileSystem.resolvePath(src, context.currentPath)
      const destResolved = context.fileSystem.resolvePath(dest, context.currentPath)
      context.fileSystem.moveEntry(srcResolved, destResolved)
      return { success: true, data: { output: '' } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  curl: (args) => {
    const headOnly = args.includes('-I')
    const url = args.find((arg) => !arg.startsWith('-'))

    if (!url) {
      return { success: false, error: 'curl: missing URL' }
    }

    let targetUrl = url
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }

    return {
      success: true,
      data: {
        output: '',
        curlUrl: targetUrl,
        curlMethod: headOnly ? 'HEAD' : 'GET',
      },
    }
  },

  man: (args) => {
    if (args.length === 0) {
      return { success: false, error: 'man: What manual page do you want?' }
    }

    const page = manPages[args[0]]
    if (!page) {
      return { success: false, error: `man: No manual entry for ${args[0]}` }
    }

    return { success: true, data: { output: page } }
  },

  cowsay: (args) => {
    const message = args.join(' ') || 'Hello, world!'
    const bubbleWidth = Math.min(message.length + 2, 40)
    const bubble = ` ${'_'.repeat(bubbleWidth)}\n< ${message.padEnd(bubbleWidth - 2, ' ')} >\n ${'-'.repeat(bubbleWidth)}`

    const cow = [
      '        \\   ^__^',
      '         \\  (oo)\\_______',
      '            (__)\\       )\\/\\',
      '                ||----w |',
      '                ||     ||',
    ]

    return { success: true, data: { output: bubble + '\n' + cow.join('\n') } }
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
