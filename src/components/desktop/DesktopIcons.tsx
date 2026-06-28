import type { WindowApp } from '../../lib/desktopStore'

const DESKTOP_APPS: { id: WindowApp; label: string; icon: string }[] = [
  { id: 'terminal', label: 'Terminal', icon: '>' },
  { id: 'files', label: 'Files', icon: '📁' },
  { id: 'editor', label: 'Editor', icon: '📝' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export function DesktopIcons({ onOpen }: { onOpen: (app: WindowApp, label: string) => void }) {
  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-3">
      {DESKTOP_APPS.map((app) => (
        <button
          key={app.id}
          onDoubleClick={() => onOpen(app.id, app.label)}
          className="flex flex-col items-center gap-1 p-2 w-20 rounded hover:bg-terminal-green-dark/20 focus:outline-none focus:ring-1 focus:ring-terminal-green/50 transition-colors group"
          title={`Open ${app.label}`}
        >
          <span className="text-2xl">{app.icon}</span>
          <span className="text-xs text-terminal-green-dim font-mono text-center group-hover:text-terminal-green transition-colors">
            {app.label}
          </span>
        </button>
      ))}
    </div>
  )
}
