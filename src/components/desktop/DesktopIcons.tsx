// src/components/desktop/DesktopIcons.tsx
// Launcher icons on the desktop surface. Single click opens (browser-friendly).
import { APPS, useDesktopStore } from '../../lib/desktopStore'

export function DesktopIcons() {
  const openApp = useDesktopStore((s) => s.openApp)

  return (
    <div className="absolute top-6 left-5 z-0 flex flex-col gap-4 select-none">
      {APPS.map((app) => (
        <button
          key={app.id}
          onClick={() => openApp(app.id)}
          className="group flex flex-col items-center gap-1 w-20 cursor-pointer focus:outline-none"
          title={`Open ${app.title}`}
        >
          <span
            className="w-14 h-14 flex items-center justify-center text-2xl rounded-md border text-terminal-green group-hover:bg-terminal-green/10 terminal-glow"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-terminal-green) 30%, transparent)',
              boxShadow: '0 0 12px color-mix(in srgb, var(--color-terminal-green) 8%, transparent)',
            }}
          >
            {app.glyph}
          </span>
          <span className="text-xs tracking-wide text-terminal-green-dark group-hover:text-terminal-green">
            {app.title}
          </span>
        </button>
      ))}
    </div>
  )
}
