import { useState, useCallback } from 'react'
import { useTerminalStore } from '../../lib/terminalStore'

export function FileManager() {
  const fileSystem = useTerminalStore((s) => s.fileSystem)
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const entries = useCallback(() => {
    try {
      const items = fileSystem.listDirectory(currentPath)
      return items.map((name) => {
        const fullPath = currentPath === '/' ? '/' + name : currentPath + '/' + name
        const entry = fileSystem.getEntry(fullPath)
        return { name, type: entry?.type || 'file', path: fullPath }
      })
    } catch {
      return []
    }
  }, [fileSystem, currentPath])

  const navigateTo = (path: string) => {
    setCurrentPath(path)
    setSelectedFile(null)
  }

  const navigateUp = () => {
    const parent = fileSystem.getParent(currentPath)
    if (parent !== currentPath) navigateTo(parent)
  }

  const dirs = entries().filter((e) => e.type === 'directory')
  const files = entries().filter((e) => e.type !== 'directory')

  return (
    <div className="h-full flex flex-col font-mono text-xs">
      <div className="flex items-center gap-2 p-2 bg-terminal-green-dark/10 border-b border-terminal-green-dark/30">
        <button onClick={navigateUp} className="px-2 py-0.5 text-terminal-green hover:bg-terminal-green-dark/20 rounded">&#x2191;</button>
        <span className="text-terminal-green-dim">{currentPath}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {dirs.length === 0 && files.length === 0 && (
          <div className="text-terminal-green-dim">Empty directory</div>
        )}

        {dirs.map((dir) => (
          <div
            key={dir.path}
            onDoubleClick={() => navigateTo(dir.path)}
            className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-terminal-green-dark/20 text-terminal-green transition-colors"
          >
            <span className="text-terminal-yellow">&#x1F4C1;</span>
            <span>{dir.name}/</span>
          </div>
        ))}

        {files.map((file) => (
          <div
            key={file.path}
            onClick={() => setSelectedFile(file.path)}
            className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-terminal-green-dark/20 transition-colors ${
              selectedFile === file.path ? 'bg-terminal-green-dark/30' : ''
            }`}
          >
            <span className="text-terminal-green-dim">&#x1F4C4;</span>
            <span className="text-terminal-green-dim">{file.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
