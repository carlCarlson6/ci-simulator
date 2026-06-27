import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTerminalStore } from '../lib/terminalStore'

export const Route = createFileRoute('/$pageName')({
  component: PageRoute,
})

function PageRoute() {
  const { pageName } = Route.useParams()

  const fileSystem = useTerminalStore((s) => s.fileSystem)
  const initialize = useTerminalStore((s) => s.initialize)
  const [ready, setReady] = useState(false)
  const initRef = useRef(false)

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true
      if (fileSystem.entries.size <= 1) {
        initialize()
      }
    }
    setReady(true)
  }, [])

  if (!pageName || pageName.includes('..') || pageName.includes('/') || pageName.includes('\0')) {
    return <NotFound />
  }

  if (!ready) return null

  const dir = `/home/user/wwwroot/${pageName}`
  const dirEntry = fileSystem.entries.get(dir)
  if (!dirEntry || dirEntry.type !== 'directory') {
    return <NotFound />
  }

  const htmlEntry = fileSystem.entries.get(`${dir}/index.html`)
  if (!htmlEntry || htmlEntry.type !== 'file') {
    return <NotFound />
  }

  const htmlContent = htmlEntry.content || ''
  const cssEntry = fileSystem.entries.get(`${dir}/style.css`)
  const cssContent = cssEntry?.type === 'file' ? cssEntry.content || '' : ''

  const srcdoc = buildPage(htmlContent, cssContent)

  return (
    <div style={{ height: '100vh', width: '100vw', margin: 0, position: 'relative', background: '#000' }}>
      <iframe
        srcDoc={srcdoc}
        sandbox=""
        style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
        title={pageName}
      />
      <a
        href="/"
        style={{
          position: 'fixed',
          top: '8px',
          left: '8px',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          color: '#888',
          textDecoration: 'none',
          background: 'rgba(0,0,0,0.6)',
          padding: '4px 8px',
          borderRadius: '4px',
          zIndex: 1000,
          lineHeight: 1.4,
        }}
      >
        ⧉ Terminal
      </a>
    </div>
  )
}

function buildPage(html: string, css: string): string {
  const styleTag = css ? `\n<style>${css}</style>\n` : ''
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">${styleTag}
</head>
<body>
${html}
</body>
</html>`
}

function NotFound() {
  return (
    <div
      style={{
        background: '#111',
        color: '#ccc',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        margin: 0,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: '#888', fontSize: '1.5rem', margin: '0 0 0.5rem', fontWeight: 600 }}>404</h1>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>Page not found</p>
      </div>
    </div>
  )
}
