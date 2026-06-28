import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useDesktopStore } from '../../lib/desktopStore'
import type { WindowApp } from '../../lib/desktopStore'

const MENU_APPS: { id: WindowApp; label: string; icon: string }[] = [
  { id: 'terminal', label: 'Terminal', icon: '>' },
  { id: 'files', label: 'Files', icon: '📁' },
  { id: 'editor', label: 'Editor', icon: '📝' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export function StartMenu({ onClose }: { onClose: () => void }) {
  const openWindow = useDesktopStore((s) => s.openWindow)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-10 left-2 w-56 bg-black/95 border border-terminal-green-dark/60 rounded-lg shadow-[0_0_20px_rgba(0,255,0,0.15)] z-[100] py-2"
    >
      <div className="px-3 py-2 text-terminal-green-dim text-xs font-mono border-b border-terminal-green-dark/30 mb-1">
        CI-OS v1.0.0
      </div>

      {MENU_APPS.map((app) => (
        <button
          key={app.id}
          onClick={() => { openWindow(app.id, app.label); onClose() }}
          className="w-full flex items-center gap-3 px-3 py-2 text-terminal-green font-mono text-sm hover:bg-terminal-green-dark/20 transition-colors text-left"
        >
          <span className="text-lg">{app.icon}</span>
          <span>{app.label}</span>
        </button>
      ))}

      <div className="border-t border-terminal-green-dark/30 mt-1 pt-1">
        <button
          onClick={() => { navigate({ to: '/' }); onClose() }}
          className="w-full flex items-center gap-3 px-3 py-2 text-terminal-green font-mono text-sm hover:bg-terminal-green-dark/20 transition-colors text-left"
        >
          <span>&#x2302;</span>
          <span>Terminal (Fullscreen)</span>
        </button>
      </div>
    </div>
  )
}
