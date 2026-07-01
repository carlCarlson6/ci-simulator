// src/components/desktop/Window.tsx
// Window chrome for the desktop: draggable title bar, resize handle,
// minimize / maximize / close buttons. Geometry lives in desktopStore;
// minimized windows stay mounted (display: none) so app state survives.
import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useDesktopStore, getAppMeta } from '../../lib/desktopStore'
import type { DesktopWindow } from '../../lib/desktopStore'

export function Window({
  win,
  focused,
  children,
}: {
  win: DesktopWindow
  focused: boolean
  children: ReactNode
}) {
  const focusWindow = useDesktopStore((s) => s.focusWindow)
  const closeWindow = useDesktopStore((s) => s.closeWindow)
  const minimizeWindow = useDesktopStore((s) => s.minimizeWindow)
  const toggleMaximize = useDesktopStore((s) => s.toggleMaximize)
  const moveWindow = useDesktopStore((s) => s.moveWindow)
  const resizeWindow = useDesktopStore((s) => s.resizeWindow)
  const rootRef = useRef<HTMLDivElement>(null)

  const meta = getAppMeta(win.appId)

  function startDrag(e: React.PointerEvent) {
    if (win.maximized) return
    if ((e.target as HTMLElement).closest('button')) return
    const bounds = rootRef.current?.parentElement
    if (!bounds) return
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const origX = win.x
    const origY = win.y
    const bw = bounds.clientWidth
    const bh = bounds.clientHeight

    const onMove = (ev: PointerEvent) => {
      // Keep part of the title bar reachable so the window can't be lost.
      const x = Math.min(Math.max(origX + ev.clientX - startX, 64 - win.width), bw - 64)
      const y = Math.min(Math.max(origY + ev.clientY - startY, 0), bh - 32)
      moveWindow(win.id, x, y)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function startResize(e: React.PointerEvent) {
    if (win.maximized) return
    e.preventDefault()
    e.stopPropagation()
    focusWindow(win.id)
    const startX = e.clientX
    const startY = e.clientY
    const origW = win.width
    const origH = win.height

    const onMove = (ev: PointerEvent) => {
      resizeWindow(win.id, origW + ev.clientX - startX, origH + ev.clientY - startY)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const rect: React.CSSProperties = win.maximized
    ? { left: 0, top: 0, width: '100%', height: '100%' }
    : { left: win.x, top: win.y, width: win.width, height: win.height }

  return (
    <div
      ref={rootRef}
      className="absolute flex flex-col bg-terminal-bg border rounded-md overflow-hidden pointer-events-auto"
      style={{
        ...rect,
        zIndex: win.zIndex,
        display: win.minimized ? 'none' : undefined,
        borderColor: focused
          ? 'color-mix(in srgb, var(--color-terminal-green) 55%, transparent)'
          : 'color-mix(in srgb, var(--color-terminal-green) 22%, transparent)',
        boxShadow: focused
          ? '0 0 24px color-mix(in srgb, var(--color-terminal-green) 18%, transparent), 0 12px 40px rgba(0, 0, 0, 0.6)'
          : '0 8px 24px rgba(0, 0, 0, 0.5)',
      }}
      onPointerDown={() => focusWindow(win.id)}
    >
      {/* Title bar */}
      <div
        className="shrink-0 flex items-center justify-between px-3 py-1.5 select-none cursor-move terminal-title-border bg-terminal-bg"
        onPointerDown={startDrag}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-terminal-cyan text-sm">{meta.glyph}</span>
          <span
            className={`text-sm tracking-widest uppercase truncate ${
              focused ? 'text-terminal-green terminal-glow' : 'text-terminal-green-dark'
            }`}
          >
            {meta.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <WindowButton label="Minimize" onClick={() => minimizeWindow(win.id)}>
            –
          </WindowButton>
          <WindowButton label="Maximize" onClick={() => toggleMaximize(win.id)}>
            {win.maximized ? '❐' : '□'}
          </WindowButton>
          <WindowButton label="Close" danger onClick={() => closeWindow(win.id)}>
            ✕
          </WindowButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>

      {/* Resize handle */}
      {!win.maximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          onPointerDown={startResize}
        >
          <div
            className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2"
            style={{ borderColor: 'color-mix(in srgb, var(--color-terminal-green) 45%, transparent)' }}
          />
        </div>
      )}
    </div>
  )
}

function WindowButton({
  children,
  onClick,
  danger,
  label,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
  label: string
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`w-5 h-5 flex items-center justify-center rounded-sm text-xs leading-none border cursor-pointer ${
        danger
          ? 'text-terminal-red hover:bg-terminal-red/20'
          : 'text-terminal-green-dark hover:bg-terminal-green/15 hover:text-terminal-green'
      }`}
      style={{ borderColor: 'color-mix(in srgb, var(--color-terminal-green) 25%, transparent)' }}
    >
      {children}
    </button>
  )
}
