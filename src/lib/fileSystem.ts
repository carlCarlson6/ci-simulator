export type FileType = 'file' | 'directory' | 'link' | 'device' | 'proc'

export type FileSystemEntry = {
  type: FileType
  content?: string
  mode?: number
  uid?: number
  gid?: number
  atime?: number
  mtime?: number
  ctime?: number
  linkTarget?: string
}

export class FileSystem {
  entries: Map<string, FileSystemEntry>

  constructor() {
    this.entries = new Map()
    this.createDirectory('/')
  }

  resolvePath(path: string, cwd: string = '/'): string {
    if (path === '~' || path === '') return '/'
    if (path.startsWith('~')) path = '/' + path.slice(1)

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

  isFile(path: string): boolean {
    return this.getEntry(path)?.type === 'file'
  }

  isLink(path: string): boolean {
    return this.getEntry(path)?.type === 'link'
  }

  createDirectory(path: string, mode?: number): void {
    const normalized = this.resolvePath(path)
    if (this.entries.has(normalized)) {
      throw new Error(`mkdir: cannot create directory '${path}': File exists`)
    }

    this.entries.set(normalized, { type: 'directory', mode: mode ?? 0o755, uid: 1000, gid: 1000, mtime: Date.now(), ctime: Date.now(), atime: Date.now() })

    const parts = normalized.split('/').filter(Boolean)
    let current = ''
    for (const part of parts.slice(0, -1)) {
      current += '/' + part
      if (!this.entries.has(current)) {
        this.entries.set(current, { type: 'directory', mode: 0o755, uid: 1000, gid: 1000, mtime: Date.now(), ctime: Date.now(), atime: Date.now() })
      }
    }
  }

  createFile(path: string, content: string = '', mode?: number): void {
    const normalized = this.resolvePath(path)
    this.entries.set(normalized, { type: 'file', content, mode: mode ?? 0o644, uid: 1000, gid: 1000, mtime: Date.now(), ctime: Date.now(), atime: Date.now() })
  }

  readFile(path: string): string {
    const normalized = this.resolvePath(path)
    if (normalized.startsWith('/dev/')) {
      return this.readDevFile(normalized)
    }
    if (normalized.startsWith('/proc/')) {
      return this.readProcFile(normalized)
    }

    const entry = this.getEntry(normalized)
    if (!entry) throw new Error(`cat: ${path}: No such file or directory`)
    if (entry.type === 'directory') throw new Error(`cat: ${path}: Is a directory`)

    if (entry.type === 'link' && entry.linkTarget) {
      return this.readFile(entry.linkTarget)
    }

    if (entry.type === 'device') {
      return this.readDevFile(normalized)
    }

    return entry.content || ''
  }

  writeFile(path: string, content: string): void {
    const normalized = this.resolvePath(path)
    const entry = this.getEntry(normalized)

    if (normalized === '/dev/null') return

    if (entry?.type === 'directory') {
      throw new Error(`edit: ${path}: Is a directory`)
    }

    this.entries.set(normalized, { type: 'file', content, mode: entry?.mode ?? 0o644, uid: entry?.uid ?? 1000, gid: entry?.gid ?? 1000, mtime: Date.now(), ctime: entry?.ctime ?? Date.now(), atime: Date.now() })
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
          this.entries.set(newKey, { ...val })
        }
      }
    } else {
      this.entries.set(destNorm, { ...entry })
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
      this.entries.set(destNorm, { ...entry })
    }
  }

  listDirectory(path: string): string[] {
    const normalized = this.resolvePath(path)

    if (normalized.startsWith('/proc') && normalized !== '/proc') {
      return this.listProcDirectory(normalized)
    }
    if (normalized.startsWith('/dev') && normalized !== '/dev') {
      return []
    }

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

    if (normalized === '/') {
      result.push('proc', 'dev')
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
    for (const [key] of this.entries) {
      if (key === '/') continue
      paths.push(key)
    }
    return paths.sort()
  }

  initializeDefaults(): void {
    const dirs = ['/projects', '/etc', '/wwwroot', '/wwwroot/example']
    for (const dir of dirs) {
      if (!this.entries.has(dir)) this.entries.set(dir, { type: 'directory', mode: 0o755, uid: 1000, gid: 1000, mtime: Date.now(), ctime: Date.now(), atime: Date.now() })
    }

    this.createFile('/welcome.txt', 'Welcome to the Terminal Simulator!\n\nType `help` to see available commands.\n')
    this.createFile('/projects/README.md', '# Project: Neural Link\n\nA neural interface for direct brain-computer communication.\n')
    this.createFile('/WELCOME_OUTPUT', 'Terminal Simulator v1.0.0\nType `help` to see available commands.\n')

    this.createFile('/wwwroot/example/index.html',
`<h1>Hello, World!</h1>
<p>Welcome to my first page on the virtual terminal.</p>
<p>This page is served from <code>/wwwroot/example/</code>.</p>
`)

    this.createFile('/wwwroot/example/style.css',
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

    this.createFile('/etc/hosts', '127.0.0.1  localhost localhost.localdomain\n::1        localhost\n')
    this.createFile('/etc/hostname', 'ci-simulator\n')
  }

  chmod(path: string, mode: number): void {
    const normalized = this.resolvePath(path)
    const entry = this.getEntry(normalized)
    if (!entry) throw new Error(`chmod: cannot access '${path}': No such file or directory`)
    entry.mode = mode
    entry.ctime = Date.now()
  }

  chown(path: string, uid: number, gid: number): void {
    const normalized = this.resolvePath(path)
    const entry = this.getEntry(normalized)
    if (!entry) throw new Error(`chown: cannot access '${path}': No such file or directory`)
    entry.uid = uid
    entry.gid = gid
    entry.ctime = Date.now()
  }

  symlink(target: string, linkPath: string): void {
    const normalized = this.resolvePath(linkPath)
    if (this.entries.has(normalized)) {
      throw new Error(`ln: cannot create symlink '${linkPath}': File exists`)
    }
    this.entries.set(normalized, { type: 'link', linkTarget: target, mode: 0o777, uid: 1000, gid: 1000, mtime: Date.now(), ctime: Date.now(), atime: Date.now() })
  }

  readlink(path: string): string {
    const normalized = this.resolvePath(path)
    const entry = this.getEntry(normalized)
    if (!entry) throw new Error(`readlink: ${path}: No such file or directory`)
    if (entry.type !== 'link') throw new Error(`readlink: ${path}: Not a symlink`)
    return entry.linkTarget || ''
  }

  stat(path: string): FileSystemEntry {
    const normalized = this.resolvePath(path)
    const entry = this.getEntry(normalized)
    if (!entry) throw new Error(`stat: cannot stat '${path}': No such file or directory`)
    return { ...entry }
  }

  private readDevFile(path: string): string {
    switch (path) {
      case '/dev/null':
        return ''
      case '/dev/zero':
        return '\x00'
      case '/dev/random':
        return String(Math.random())
      case '/dev/stdin':
        return ''
      case '/dev/stdout':
        return ''
      case '/dev/stderr':
        return ''
      default:
        throw new Error(`cat: ${path}: No such device`)
    }
  }

  private readProcFile(path: string): string {
    const parts = path.split('/').filter(Boolean)

    if (path === '/proc/cpuinfo') {
      return `processor\t: 0\nvendor_id\t: CI-OS\ncpu family\t: 1\nmodel\t\t: Virtual\nmodel name\t: CI-OS Virtual CPU @ 2.4GHz\nstepping\t: 0\ncpu MHz\t\t: 2400.000\ncache size\t: 4096 KB\n`
    }

    if (path === '/proc/meminfo') {
      return `MemTotal:        8388608 kB\nMemFree:         4194304 kB\nMemAvailable:    6291456 kB\nBuffers:          262144 kB\nCached:          1048576 kB\n`
    }

    if (path === '/proc/uptime') {
      const uptime = Math.floor((Date.now() - ((window as any).__START_TIME || Date.now())) / 1000)
      return `${uptime}.00 ${Math.floor(uptime / 60)}.00\n`
    }

    if (path === '/proc/version') {
      return `CI-OS version 1.0.0 (user@ci-simulator) (gcc version 14.2.0) #1 SMP Sun Jun 28 10:00:00 UTC 2026\n`
    }

    if (parts.length === 3 && parts[2] === 'cmdline') {
      const pid = parseInt(parts[1], 10)
      if (!isNaN(pid)) {
        return `bash\n`
      }
    }

    if (parts.length === 3 && parts[2] === 'status') {
      const pid = parseInt(parts[1], 10)
      if (!isNaN(pid)) {
        return `Name:\tbash\nState:\tR (running)\nPid:\t${pid}\n`
      }
    }

    throw new Error(`cat: ${path}: No such file or directory`)
  }

  private listProcDirectory(path: string): string[] {
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 1) {
      return ['cpuinfo', 'meminfo', 'uptime', 'version', '1', 'self']
    }
    return []
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
