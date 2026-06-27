// src/lib/fileSystem.ts

export type FileSystemEntry = {
  type: 'file' | 'directory'
  content?: string
}

export class FileSystem {
  entries: Map<string, FileSystemEntry>

  constructor() {
    this.entries = new Map()
    this.createDirectory('/')
  }

  resolvePath(path: string, cwd: string = '/'): string {
    if (path === '~') return '/home/user'
    if (path.startsWith('~')) path = '/home/user' + path.slice(1)

    let absolute = path.startsWith('/') ? path : (cwd === '/' ? '/' + path : cwd + '/' + path)
    const parts = absolute.split('/').filter(Boolean)
    const resolved: string[] = []

    for (const part of parts) {
      if (part === '..') resolved.pop()
      else if (part !== '.') resolved.push(part)
    }

    return '/' + resolved.join('/')
  }

  getEntry(path: string): FileSystemEntry | undefined {
    return this.entries.get(this.resolvePath(path))
  }

  exists(path: string): boolean {
    return this.getEntry(path) !== undefined
  }

  isDirectory(path: string): boolean {
    return this.getEntry(path)?.type === 'directory'
  }

  createDirectory(path: string): void {
    const normalized = this.resolvePath(path)
    if (this.entries.has(normalized)) {
      throw new Error(`mkdir: cannot create directory '${path}': File exists`)
    }

    this.entries.set(normalized, { type: 'directory' })

    // Ensure parent directories exist
    const parts = normalized.split('/').filter(Boolean)
    let current = ''
    for (const part of parts.slice(0, -1)) {
      current += '/' + part
      if (!this.entries.has(current)) {
        this.entries.set(current, { type: 'directory' })
      }
    }
  }

  createFile(path: string, content: string = ''): void {
    this.entries.set(this.resolvePath(path), { type: 'file', content })
  }

  readFile(path: string): string {
    const entry = this.getEntry(path)
    if (!entry) throw new Error(`cat: ${path}: No such file or directory`)
    if (entry.type === 'directory') throw new Error(`cat: ${path}: Is a directory`)
    return entry.content || ''
  }

  writeFile(path: string, content: string): void {
    const normalized = this.resolvePath(path)
    const entry = this.getEntry(normalized)

    if (entry?.type === 'directory') {
      throw new Error(`edit: ${path}: Is a directory`)
    }

    this.entries.set(normalized, { type: 'file', content })
  }

  removeEntry(path: string, recursive: boolean = false): void {
    const normalized = this.resolvePath(path)
    const entry = this.getEntry(normalized)

    if (!entry) throw new Error(`rm: cannot remove '${path}': No such file or directory`)
    if (entry.type === 'directory' && !recursive) {
      throw new Error(`rm: cannot remove '${path}': Is a directory`)
    }

    if (entry.type === 'directory' && recursive) {
      for (const [key] of this.entries) {
        if (key === normalized || key.startsWith(normalized + '/')) {
          this.entries.delete(key)
        }
      }
    } else {
      this.entries.delete(normalized)
    }
  }

  copyEntry(src: string, dest: string, recursive: boolean = false): void {
    const srcNorm = this.resolvePath(src)
    const destNorm = this.resolvePath(dest)
    const entry = this.getEntry(srcNorm)

    if (!entry) {
      throw new Error(`cp: cannot stat '${src}': No such file or directory`)
    }

    if (this.exists(destNorm)) {
      throw new Error(`cp: cannot copy '${src}' to '${dest}': File exists`)
    }

    if (entry.type === 'directory' && !recursive) {
      throw new Error(`cp: -r not specified; omitting directory '${src}'`)
    }

    if (entry.type === 'directory' && recursive) {
      this.createDirectory(destNorm)
      for (const [key, val] of this.entries) {
        if (key === srcNorm || key.startsWith(srcNorm + '/')) {
          const relative = key.slice(srcNorm.length)
          const newKey = destNorm + relative
          this.entries.set(newKey, {
            type: val.type,
            content: val.content,
          })
        }
      }
    } else {
      this.createFile(destNorm, entry.content || '')
    }
  }

  moveEntry(src: string, dest: string): void {
    const srcNorm = this.resolvePath(src)
    const destNorm = this.resolvePath(dest)
    const entry = this.getEntry(srcNorm)

    if (!entry) {
      throw new Error(`mv: cannot stat '${src}': No such file or directory`)
    }

    if (this.exists(destNorm)) {
      throw new Error(`mv: cannot move '${src}' to '${dest}': File exists`)
    }

    const destParent = this.getParent(destNorm)
    if (!this.exists(destParent)) {
      throw new Error(`mv: cannot move '${src}' to '${dest}': No such file or directory`)
    }

    if (entry.type === 'directory') {
      const entriesToMove: [string, FileSystemEntry][] = []
      for (const [key, val] of this.entries) {
        if (key === srcNorm || key.startsWith(srcNorm + '/')) {
          const relative = key.slice(srcNorm.length)
          const newKey = destNorm + relative
          entriesToMove.push([newKey, { ...val }])
        }
      }
      for (const [key] of this.entries) {
        if (key === srcNorm || key.startsWith(srcNorm + '/')) {
          this.entries.delete(key)
        }
      }
      for (const [key, val] of entriesToMove) {
        this.entries.set(key, val)
      }
    } else {
      this.entries.delete(srcNorm)
      this.entries.set(destNorm, {
        type: 'file',
        content: entry.content,
      })
    }
  }

  listDirectory(path: string): string[] {
    const normalized = this.resolvePath(path)
    const entry = this.getEntry(normalized)

    if (!entry) throw new Error(`ls: cannot access '${path}': No such file or directory`)
    if (entry.type === 'file') return [normalized.split('/').pop() || '']

    const result: string[] = []
    for (const [key] of this.entries) {
      if (key === normalized) continue
      if (!key.startsWith(normalized === '/' ? '' : normalized + '/')) continue
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
    return this.resolvePath(path).split('/').filter(Boolean).pop() || ''
  }

  getAllPaths(): string[] {
    const paths: string[] = []
    for (const [key, entry] of this.entries) {
      if (key === '/') continue
      paths.push(key)
    }
    return paths.sort()
  }

  initializeDefaults(): void {
    const dirs = ['/home', '/home/user', '/home/user/projects', '/etc']
    for (const dir of dirs) {
      if (!this.entries.has(dir)) this.entries.set(dir, { type: 'directory' })
    }

    const wwwrootDirs = [
      '/home/user/wwwroot',
      '/home/user/wwwroot/example',
    ]
    for (const dir of wwwrootDirs) {
      if (!this.entries.has(dir)) this.entries.set(dir, { type: 'directory' })
    }

    this.createFile('/home/user/welcome.txt', 'Welcome to the Terminal Simulator!\n\nType `help` to see available commands.\n')
    this.createFile('/home/user/projects/README.md', '# Project: Neural Link\n\nA neural interface for direct brain-computer communication.\n')
    this.createFile('/WELCOME_OUTPUT', 'Terminal Simulator v1.0.0\nType `help` to see available commands.\n')

    this.createFile('/home/user/wwwroot/example/index.html',
`<h1>Hello, World!</h1>
<p>Welcome to my first page on the virtual terminal.</p>
<p>This page is served from <code>~/wwwroot/example/</code>.</p>
`)

    this.createFile('/home/user/wwwroot/example/style.css',
`body {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 640px;
  margin: 4rem auto;
  padding: 0 1rem;
  background: #faf9f6;
  color: #1a1a1a;
  line-height: 1.6;
}
h1 { color: #2563eb; }
code { background: #e8e8e8; padding: 0.15rem 0.4rem; border-radius: 4px; }
`)
  }

  serialize(): [string, FileSystemEntry][] {
    return Array.from(this.entries.entries())
  }

  deserialize(data: [string, FileSystemEntry][]): void {
    this.entries.clear()
    for (const [path, entry] of data) {
      this.entries.set(path, entry)
    }
  }

  clear(): void {
    this.entries.clear()
    this.createDirectory('/')
  }
}

export function createFileSystemFromSerialized(
  entries: [string, FileSystemEntry][]
): FileSystem {
  const fs = new FileSystem()
  fs.deserialize(entries)
  return fs
}
