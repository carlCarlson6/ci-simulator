import { useState, useEffect } from 'react'
import { useDesktopStore } from '../../lib/desktopStore'

export function Taskbar({ onStartClick }: { onStartClick: () => void }) {
  const [time, setTime] = useState(new Date())
  const windows = useDesktopStore((s) => s.windows)
  const restoreWindow = useDesktopStore((s) => s.restoreWindow)
  const focusWindow = useDesktopStore((s) => s.focusWindow)

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-10 bg-black/90 border-t border-terminal-green-dark/50 flex items-center shrink-0 z-50 px-2 gap-1">
      <button
        onClick={onStartClick}
        className="px-3 h-8 bg-terminal-green-dark/20 hover:bg-terminal-green-dark/40 text-terminal-green font-mono text-sm rounded transition-colors"
      >
        Start
      </button>

      <div className="flex-1 flex items-center gap-1 px-2 overflow-x-auto">
        {windows.map((win) => (
          <button
            key={win.id}
            onClick={() => win.minimized ? restoreWindow(win.id) : focusWindow(win.id)}
            className={`px-3 h-8 text-xs font-mono rounded transition-colors truncate max-w-[150px] ${
              win.focused && !win.minimized
                ? 'bg-terminal-green-dark/40 text-terminal-green'
                : 'bg-terminal-green-dark/10 text-terminal-green-dim hover:bg-terminal-green-dark/30'
            }`}
          >
            {win.title}
          </button>
        ))}
      </div>

      <div className="text-terminal-green font-mono text-xs tabular-nums px-3">
        {time.toLocaleTimeString()}
      </div>
    </div>
  )
}
