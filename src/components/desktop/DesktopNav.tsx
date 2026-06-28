import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'

export function DesktopNav() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <nav className="h-10 bg-black/80 border-b border-terminal-green-dark/50 flex items-center justify-between px-4 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="text-terminal-green hover:text-terminal-green-dim transition-colors font-mono text-sm"
        >
          &#x2302; Terminal
        </Link>
        <span className="text-terminal-green-dim text-xs font-mono">
          CI-OS v1.0.0
        </span>
      </div>
      <div className="text-terminal-green font-mono text-sm tabular-nums">
        {time.toLocaleTimeString()}
      </div>
    </nav>
  )
}
