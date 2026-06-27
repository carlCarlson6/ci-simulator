import { FileSystem } from '../fileSystem'

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

export function renderFileSystemTree(fileSystem: FileSystem): string {
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

export function renderTreeFromPath(fileSystem: FileSystem, startPath: string): string {
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

export function formatLsLong(fileSystem: FileSystem, path: string, name: string): string {
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
