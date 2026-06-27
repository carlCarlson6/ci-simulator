// src/lib/fileSystem.ts

export type FileSystemEntry = {
  type: 'file' | 'directory'
  content?: string
  createdAt: Date
  modifiedAt: Date
}

export class FileSystem {
  entries: Map<string, FileSystemEntry>

  constructor() {
    this.entries = new Map()
    this.createDirectory('/')
  }

  resolvePath(path: string, cwd: string = '/'): string {
    if (path === '~') return '/home/user'
    if (path.startsWith('~')) {
      path = '/home/user' + path.slice(1)
    }

    let absolute: string
    if (path.startsWith('/')) {
      absolute = path
    } else {
      absolute = cwd === '/' ? '/' + path : cwd + '/' + path
    }

    const parts = absolute.split('/').filter(Boolean)
    const resolved: string[] = []

    for (const part of parts) {
      if (part === '..') {
        resolved.pop()
      } else if (part !== '.') {
        resolved.push(part)
      }
    }

    return '/' + resolved.join('/')
  }

  getEntry(path: string): FileSystemEntry | undefined {
    const normalized = this.resolvePath(path)
    return this.entries.get(normalized)
  }

  exists(path: string): boolean {
    return this.getEntry(path) !== undefined
  }

  isDirectory(path: string): boolean {
    const entry = this.getEntry(path)
    return entry?.type === 'directory'
  }

  isFile(path: string): boolean {
    const entry = this.getEntry(path)
    return entry?.type === 'file'
  }

  createDirectory(path: string): void {
    const normalized = this.resolvePath(path)
    if (this.entries.has(normalized)) {
      throw new Error(`mkdir: cannot create directory '${path}': File exists`)
    }

    const now = new Date()
    this.entries.set(normalized, {
      type: 'directory',
      createdAt: now,
      modifiedAt: now,
    })

    // Ensure parent directories exist
    const parts = normalized.split('/').filter(Boolean)
    let current = ''
    for (const part of parts.slice(0, -1)) {
      current += '/' + part
      if (!this.entries.has(current)) {
        this.entries.set(current, {
          type: 'directory',
          createdAt: now,
          modifiedAt: now,
        })
      }
    }
  }

  createFile(path: string, content: string = ''): void {
    const normalized = this.resolvePath(path)
    const now = new Date()
    this.entries.set(normalized, {
      type: 'file',
      content,
      createdAt: now,
      modifiedAt: now,
    })
  }

  readFile(path: string): string {
    const entry = this.getEntry(path)
    if (!entry) {
      throw new Error(`cat: ${path}: No such file or directory`)
    }
    if (entry.type === 'directory') {
      throw new Error(`cat: ${path}: Is a directory`)
    }
    return entry.content || ''
  }

  removeEntry(path: string, recursive: boolean = false): void {
    const normalized = this.resolvePath(path)
    const entry = this.getEntry(normalized)

    if (!entry) {
      throw new Error(`rm: cannot remove '${path}': No such file or directory`)
    }

    if (entry.type === 'directory' && !recursive) {
      throw new Error(`rm: cannot remove '${path}': Is a directory`)
    }

    if (entry.type === 'directory' && recursive) {
      // Remove all entries under this directory
      for (const [key] of this.entries) {
        if (key === normalized || key.startsWith(normalized + '/')) {
          this.entries.delete(key)
        }
      }
    } else {
      this.entries.delete(normalized)
    }
  }

  listDirectory(path: string): string[] {
    const normalized = this.resolvePath(path)
    const entry = this.getEntry(normalized)

    if (!entry) {
      throw new Error(`ls: cannot access '${path}': No such file or directory`)
    }

    if (entry.type === 'file') {
      return [normalized.split('/').pop() || '']
    }

    const result: string[] = []
    for (const [key] of this.entries) {
      if (key === normalized) continue
      const relative = key.slice(normalized === '/' ? 1 : normalized.length + 1)
      if (relative && !relative.includes('/')) {
        result.push(relative)
      }
    }

    return result.sort()
  }

  getParent(path: string): string {
    const normalized = this.resolvePath(path)
    const parts = normalized.split('/').filter(Boolean)
    parts.pop()
    return '/' + parts.join('/')
  }

  getName(path: string): string {
    const normalized = this.resolvePath(path)
    const parts = normalized.split('/').filter(Boolean)
    return parts.pop() || ''
  }

  initializeDefaults(): void {
    const now = new Date()

    // Directories
    const dirs = [
      '/home',
      '/home/user',
      '/home/user/documents',
      '/home/user/projects',
      '/etc',
      '/bin',
    ]

    for (const dir of dirs) {
      if (!this.entries.has(dir)) {
        this.entries.set(dir, {
          type: 'directory',
          createdAt: now,
          modifiedAt: now,
        })
      }
    }

    // Files
    this.createFile(
      '/home/user/welcome.txt',
      'Welcome to the Cyberpunk Terminal Simulator!\n\nType `help` to see available commands.\n'
    )
    this.createFile(
      '/home/user/documents/notes.txt',
      'Meeting Notes - 2077-03-15\n\n- Arasaka project deadline extended\n- Militech contract negotiations ongoing\n- Upgrade cyberdeck firmware\n'
    )
    this.createFile(
      '/home/user/projects/README.md',
      '# Project: Neural Link\n\n## Description\nA neural interface for direct brain-computer communication.\n\n## Status\nIn development\n\n## Team\n- V (Lead Developer)\n- Jackie (Security)\n- Judy (UI/UX)\n'
    )
    this.createFile(
      '/etc/motd',
      'Welcome to the Cyberpunk Terminal Simulator v1.0.0\nType `help` to see available commands.\n'
    )
  }
}
