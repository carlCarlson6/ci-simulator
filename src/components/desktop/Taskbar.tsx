// src/components/desktop/Taskbar.tsx
// Bottom bar: app launcher menu, one button per open window, clock, and a
// link back to the fullscreen terminal at /.
import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { APPS, getAppMeta, topWindowId, useDesktopStore } from '../../lib/desktopStore'
import { useTerminalStore } from '../../lib/terminalStore'
import { getPromptPrefix } from '../../lib/auth'

export function Taskbar() {
  const windows = useDesktopStore((s) => s.windows)
  const openApp = useDesktopStore((s) => s.openApp)
  const toggleFromTaskbar = useDesktopStore((s) => s.toggleFromTaskbar)
  const user = useTerminalStore((s) => s.user)
  const [menuOpen, setMenuOpen] = useState(false)
  // null until mounted: locale time formatting differs between server and
  // client, so rendering it during SSR causes a hydration mismatch.
  const [now, setNow] = useState<Date | null>(null)
  const launcherRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(timer)
  }, [])

  // Close the launcher menu on any click outside it. (An overlay div won't
  // work here: the taskbar's backdrop-blur turns it into the containing
  // block for fixed-position children.)
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => {
      if (launcherRef.current && !launcherRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [menuOpen])

  const topId = topWindowId(windows)
  const border = 'color-mix(in srgb, var(--color-terminal-green) 25%, transparent)'

  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-10 z-20 flex items-center gap-2 px-2 bg-terminal-bg/90 backdrop-blur-sm select-none"
      style={{ borderTop: `1px solid ${border}` }}
    >
      {/* Launcher */}
      <div ref={launcherRef} className="relative h-full flex items-center">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`h-7 px-3 flex items-center gap-2 rounded border text-sm tracking-widest uppercase cursor-pointer ${
            menuOpen ? 'bg-terminal-green/15 text-terminal-green' : 'text-terminal-green-dark hover:text-terminal-green hover:bg-terminal-green/10'
          }`}
          style={{ borderColor: border }}
        >
          <span className="terminal-glow">⌬</span>
          <span>apps</span>
        </button>

        {menuOpen && (
          <div
            className="absolute bottom-10 left-0 z-30 w-52 py-1 bg-terminal-bg border rounded-md"
            style={{
              borderColor: border,
              boxShadow: '0 0 24px color-mix(in srgb, var(--color-terminal-green) 15%, transparent)',
            }}
          >
            {APPS.map((app) => (
              <button
                key={app.id}
                title={`Launch ${app.title}`}
                onClick={() => {
                  openApp(app.id)
                  setMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-1.5 text-left text-sm text-terminal-green-dark hover:text-terminal-green hover:bg-terminal-green/10 cursor-pointer"
              >
                <span className="text-terminal-cyan w-6">{app.glyph}</span>
                <span className="tracking-wide">{app.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="w-px h-5 opacity-40" style={{ backgroundColor: border }} />

      {/* Open windows */}
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto">
        {windows.map((w) => {
          const meta = getAppMeta(w.appId)
          const active = !w.minimized && w.id === topId
          return (
            <button
              key={w.id}
              onClick={() => toggleFromTaskbar(w.id)}
              className={`h-7 px-3 flex items-center gap-2 rounded border text-xs tracking-wide cursor-pointer shrink-0 ${
                active
                  ? 'bg-terminal-green/15 text-terminal-green'
                  : w.minimized
                    ? 'text-terminal-green-dim hover:text-terminal-green-dark'
                    : 'text-terminal-green-dark hover:text-terminal-green'
              }`}
              style={{ borderColor: active ? 'color-mix(in srgb, var(--color-terminal-green) 45%, transparent)' : border }}
              title={w.minimized ? `Restore ${meta.title}` : meta.title}
            >
              <span className="text-terminal-cyan">{meta.glyph}</span>
              <span className="uppercase">{meta.title}</span>
            </button>
          )
        })}
      </div>

      {/* Status: user · TTY link · clock */}
      <span className="text-xs text-terminal-green-dark tracking-wide hidden sm:inline">
        {getPromptPrefix(user)}
      </span>
      <Link
        to="/"
        className="h-7 px-3 flex items-center rounded border text-xs tracking-widest uppercase text-terminal-green-dark hover:text-terminal-green hover:bg-terminal-green/10"
        style={{ borderColor: border }}
        title="Back to the fullscreen terminal"
      >
        tty
      </Link>
      <span className="text-sm text-terminal-green terminal-glow tabular-nums px-1">
        {now ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
      </span>
    </div>
  )
}
