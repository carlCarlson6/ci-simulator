import { createFileRoute, notFound } from '@tanstack/react-router'
import { getPublishedPage } from '../lib/server-fns'

export const Route = createFileRoute('/$pageName')({
  loader: async ({ params }) => {
    const { pageName } = params

    if (!pageName || pageName.includes('..') || pageName.includes('/') || pageName.includes('\0')) {
      throw notFound()
    }

    const content = await getPublishedPage({ data: pageName })
    if (!content) {
      throw notFound()
    }

    return { ...content, pageName }
  },
  component: PageRoute,
  notFoundComponent: NotFound,
})

function PageRoute() {
  const { htmlContent, cssContent, pageName } = Route.useLoaderData()

  const styleTag = cssContent ? `\n<style>${cssContent}</style>\n` : ''
  const srcdoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body{background:#fff}</style>${styleTag}
</head>
<body>
${htmlContent}
</body>
</html>`

  return (
    <div style={{ height: '100vh', width: '100vw', margin: 0, position: 'relative', background: '#fff' }}>
      <iframe
        srcDoc={srcdoc}
        sandbox=""
        style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
        title={pageName}
      />
    </div>
  )
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
