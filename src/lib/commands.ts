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
  ls: 'ls\n\nList directory contents.\n\nUsage: ls [options] [path]\nOptions:\n  -a    Show hidden files\n  -l    Long format with permissions, size, date',
  cd: 'cd\n\nChange the current directory.\n\nUsage: cd <path>\n  cd ~       Go to home directory\n  cd -       Go to previous directory',
  pwd: 'pwd\n\nPrint the current working directory.\n\nUsage: pwd',
  cat: 'cat\n\nDisplay file contents.\n\nUsage: cat <file>',
  echo: 'echo\n\nPrint text to the terminal.\n\nUsage: echo <text>',
  mkdir: 'mkdir\n\nCreate a directory.\n\nUsage: mkdir <directory>',
  touch: 'touch\n\nCreate an empty file or update its timestamp.\n\nUsage: touch <file>',
  rm: 'rm\n\nRemove files or directories.\n\nUsage: rm [-r] <target>\n  -r    Remove directories recursively',
  cp: 'cp\n\nCopy files or directories.\n\nUsage: cp [-r] <source> <destination>\n  -r    Copy directories recursively',
  mv: 'mv\n\nMove or rename files or directories.\n\nUsage: mv <source> <destination>',
  find: 'find\n\nSearch for files in a directory hierarchy.\n\nUsage: find [path] [-name <pattern>]',
  grep: 'grep\n\nSearch file contents for a pattern.\n\nUsage: grep <pattern> [file...]\n  -r    Search directories recursively',
  ping: 'ping\n\nSend ICMP echo requests to a host.\n\nUsage: ping [-c <count>] <host>',
  ps: 'ps\n\nReport a snapshot of current processes.\n\nUsage: ps',
  top: 'top\n\nDisplay system processes and resource usage.\n\nUsage: top',
  curl: 'curl\n\nTransfer data from or to a server.\n\nUsage: curl [options] <url>\n  -I    Fetch headers only (HEAD request)',
  sudo: 'sudo\n\nExecute a command as another user.\n\nUsage: sudo <command>\n\nNote: You are not in the sudoers file.',
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
        '  ls [-a] [-l] [path]  List directory contents',
        '  cd <path>            Change directory',
        '  pwd                  Print working directory',
        '  cat <file>           Display file contents',
        '  mkdir <dir>           Create directory',
        '  touch <file>          Create empty file',
        '  rm [-r] <target>      Remove file or directory',
        '  cp [-r] <src> <dest>  Copy file or directory',
        '  mv <src> <dest>       Move or rename file or directory',
        '  find [path] [-name]   Search for files',
        '  grep [-r] <pat> [file] Search file contents',
        '',
        'System Commands:',
        '  ping [-c N] <host>    Send ICMP echo requests',
        '  ps                    List processes',
        '  top                   Show system processes',
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
        '  sudo <command>        Attempt elevated privileges',
      ].join('\n'),
    },
  }),

  clear: () => ({ success: true, data: {} }),

  ls: (args, context) => {
    const showHidden = args.includes('-a') || args.includes('-la') || args.includes('-al')
    const longFormat = args.includes('-l') || args.includes('-la') || args.includes('-al')
    const pathArg = args.find((arg) => !arg.startsWith('-'))

    const path = pathArg || context.currentPath
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

  find: (args, context) => {
    const nameFlag = args.includes('-name')
    const nameIndex = args.indexOf('-name')
    const pattern = nameFlag && nameIndex !== -1 && nameIndex + 1 < args.length ? args[nameIndex + 1] : null

    const pathArg = args.find((arg, i) => {
      if (arg.startsWith('-')) return false
      if (nameFlag && (i === nameIndex + 1 || i === nameIndex)) return false
      return true
    })

    const startPath = pathArg || context.currentPath

    try {
      const resolved = context.fileSystem.resolvePath(startPath, context.currentPath)
      const entry = context.fileSystem.getEntry(resolved)
      if (!entry) {
        return { success: false, error: `find: '${startPath}': No such file or directory` }
      }

      const allPaths = context.fileSystem.getAllPaths()
      const results: string[] = []

      for (const p of allPaths) {
        if (p === resolved || p.startsWith(resolved === '/' ? '/' : resolved + '/')) {
          const name = p.split('/').pop() || ''
          if (pattern) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
            if (regex.test(name)) {
              results.push(p)
            }
          } else {
            results.push(p)
          }
        }
      }

      return { success: true, data: { output: results.join('\n') } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  },

  grep: (args, context) => {
    const recursive = args.includes('-r')
    const patternIndex = args.findIndex((arg) => !arg.startsWith('-'))

    if (patternIndex === -1) {
      return { success: false, error: 'grep: missing pattern' }
    }

    const pattern = args[patternIndex]
    const targets = args.slice(patternIndex + 1)

    if (targets.length === 0) {
      return { success: false, error: 'grep: missing file operand' }
    }

    const results: string[] = []
    const regex = new RegExp(pattern, 'g')

    for (const target of targets) {
      try {
        const resolved = context.fileSystem.resolvePath(target, context.currentPath)
        const entry = context.fileSystem.getEntry(resolved)

        if (!entry) {
          results.push(`grep: ${target}: No such file or directory`)
          continue
        }

        if (entry.type === 'file') {
          const content = context.fileSystem.readFile(resolved)
          const lines = content.split('\n')
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              const prefix = targets.length > 1 ? `${target}:` : ''
              results.push(`${prefix}${lines[i]}`)
              regex.lastIndex = 0
            }
          }
        } else if (entry.type === 'directory' && recursive) {
          const allPaths = context.fileSystem.getAllPaths()
          for (const p of allPaths) {
            if (p === resolved || p.startsWith(resolved + '/')) {
              const fileEntry = context.fileSystem.getEntry(p)
              if (fileEntry?.type === 'file') {
                const content = context.fileSystem.readFile(p)
                const lines = content.split('\n')
                for (let i = 0; i < lines.length; i++) {
                  if (regex.test(lines[i])) {
                    results.push(`${p}:${lines[i]}`)
                    regex.lastIndex = 0
                  }
                }
              }
            }
          }
        } else if (entry.type === 'directory') {
          results.push(`grep: ${target}: Is a directory`)
        }
      } catch (error) {
        results.push((error as Error).message)
      }
    }

    if (results.some((r) => r.includes('No such file') || r.includes('Is a directory'))) {
      return { success: false, error: results.join('\n') }
    }

    if (results.length === 0) {
      return { success: true, data: { output: '' } }
    }

    return { success: true, data: { output: results.join('\n') } }
  },

  ping: (args) => {
    const countIndex = args.indexOf('-c')
    let count = 4
    if (countIndex !== -1 && countIndex + 1 < args.length) {
      const parsed = parseInt(args[countIndex + 1], 10)
      if (!isNaN(parsed) && parsed > 0) count = parsed
    }

    const host = args.find((arg, i) => {
      if (arg === '-c') return false
      if (i > 0 && args[i - 1] === '-c') return false
      return !arg.startsWith('-')
    })

    if (!host) {
      return { success: false, error: 'ping: missing host operand' }
    }

    const isLocalhost = host === 'localhost' || host === '127.0.0.1'
    const ip = isLocalhost ? '127.0.0.1' : `192.168.1.${Math.floor(Math.random() * 255)}`

    const lines: string[] = [`PING ${host} (${ip}) 56(84) bytes of data.`]
    let received = 0
    let totalTime = 0

    for (let i = 1; i <= count; i++) {
      const latency = isLocalhost ? Math.random() * 0.5 + 0.1 : Math.random() * 80 + 10
      totalTime += latency
      received++
      lines.push(`64 bytes from ${host} (${ip}): icmp_seq=${i} ttl=64 time=${latency.toFixed(2)} ms`)
    }

    const loss = ((count - received) / count) * 100
    lines.push('')
    lines.push(`--- ${host} ping statistics ---`)
    lines.push(`${count} packets transmitted, ${received} received, ${loss.toFixed(1)}% packet loss, time ${(totalTime + 10).toFixed(0)}ms`)
    lines.push(`rtt min/avg/max/mdev = ${(totalTime / count * 0.5).toFixed(3)}/${(totalTime / count).toFixed(3)}/${(totalTime / count * 1.5).toFixed(3)}/${(totalTime / count * 0.1).toFixed(3)} ms`)

    return { success: true, data: { output: lines.join('\n') } }
  },

  ps: () => {
    const processes = [
      { pid: 1, user: 'root', cpu: 0.0, mem: 0.1, cmd: 'init' },
      { pid: 42, user: 'root', cpu: 0.1, mem: 0.2, cmd: 'systemd' },
      { pid: 133, user: 'user', cpu: 2.5, mem: 1.2, cmd: 'cts' },
      { pid: 256, user: 'user', cpu: 15.3, mem: 8.5, cmd: 'browser' },
      { pid: 512, user: 'user', cpu: 3.2, mem: 2.1, cmd: 'neural-link' },
      { pid: 1024, user: 'root', cpu: 0.5, mem: 0.8, cmd: 'kernel' },
      { pid: 2048, user: 'user', cpu: 1.8, mem: 1.5, cmd: 'zsh' },
      { pid: 4096, user: 'user', cpu: 0.3, mem: 0.4, cmd: 'vim' },
    ]

    const lines = ['  PID  USER     CPU%  MEM%  COMMAND']
    for (const p of processes) {
      lines.push(
        `${String(p.pid).padStart(5, ' ')}  ${p.user.padEnd(7, ' ')}  ${p.cpu.toFixed(1).padStart(5, ' ')}  ${p.mem.toFixed(1).padStart(5, ' ')}  ${p.cmd}`
      )
    }

    return { success: true, data: { output: lines.join('\n') } }
  },

  top: () => {
    const uptime = Math.floor((Date.now() - ((window as any).__START_TIME || Date.now())) / 1000)
    const uptimeStr = `${Math.floor(uptime / 3600)}:${String(Math.floor((uptime % 3600) / 60)).padStart(2, '0')}:${String(uptime % 60).padStart(2, '0')}`

    const lines: string[] = [
      `top - ${new Date().toLocaleTimeString()} up ${uptimeStr},  1 user,  load average: ${(Math.random() * 2).toFixed(2)}, ${(Math.random() * 2).toFixed(2)}, ${(Math.random() * 2).toFixed(2)}`,
      `Tasks: 8 total,   1 running,   7 sleeping,   0 stopped,   0 zombie`,
      `%Cpu(s): ${(Math.random() * 30).toFixed(1)} us,  ${(Math.random() * 10).toFixed(1)} sy,  ${(Math.random() * 5).toFixed(1)} ni,  ${(Math.random() * 60).toFixed(1)} id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st`,
      `MiB Mem :  65536.0 total,  ${(Math.random() * 40000 + 10000).toFixed(1)} free,  ${(Math.random() * 10000 + 5000).toFixed(1)} used,  ${(Math.random() * 10000).toFixed(1)} buff/cache`,
      '',
      '  PID  USER     CPU%  MEM%  COMMAND',
    ]

    const processes = [
      { pid: 256, user: 'user', cpu: 15.3, mem: 8.5, cmd: 'browser' },
      { pid: 512, user: 'user', cpu: 3.2, mem: 2.1, cmd: 'neural-link' },
      { pid: 133, user: 'user', cpu: 2.5, mem: 1.2, cmd: 'cts' },
      { pid: 2048, user: 'user', cpu: 1.8, mem: 1.5, cmd: 'zsh' },
      { pid: 1024, user: 'root', cpu: 0.5, mem: 0.8, cmd: 'kernel' },
      { pid: 4096, user: 'user', cpu: 0.3, mem: 0.4, cmd: 'vim' },
      { pid: 42, user: 'root', cpu: 0.1, mem: 0.2, cmd: 'systemd' },
      { pid: 1, user: 'root', cpu: 0.0, mem: 0.1, cmd: 'init' },
    ]

    for (const p of processes) {
      lines.push(
        `${String(p.pid).padStart(5, ' ')}  ${p.user.padEnd(7, ' ')}  ${p.cpu.toFixed(1).padStart(5, ' ')}  ${p.mem.toFixed(1).padStart(5, ' ')}  ${p.cmd}`
      )
    }

    return { success: true, data: { output: lines.join('\n') } }
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

  sudo: () => ({
    success: false,
    error: 'sudo: You are not in the sudoers file. This incident will be reported.',
  }),

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
