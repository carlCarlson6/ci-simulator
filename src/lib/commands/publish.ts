import { publishPage } from '../server-fns'
import { CommandHandler, CommandEffect } from './types'

export const MANUAL = `publish

Publish a static page from /wwwroot/ to make it publicly accessible.

Usage: publish <path>
  <path>    Path to the page directory under /wwwroot/

The page must contain an index.html file.
Once published, it will be available at /<pageName> for all visitors.`

export const HELP_TEXT = '  publish <path>        Publish a static page to /<pageName>'

export const handler: CommandHandler = (args, context) => {
  if (!context.user) {
    return { success: false, error: 'You must be logged in to publish a page' }
  }

  if (args.length === 0) {
    return { success: false, error: 'publish: missing path\nUsage: publish <path>' }
  }

  const rawPath = args[0]
  const resolved = context.fileSystem.resolvePath(rawPath, context.currentPath)

  if (!resolved.startsWith('/wwwroot/') || resolved === '/wwwroot') {
    return { success: false, error: `publish: path must be under /wwwroot/` }
  }

  const pageName = resolved.split('/').filter(Boolean).pop()
  if (!pageName) {
    return { success: false, error: `publish: invalid path` }
  }

  if (pageName.includes('..') || pageName.includes('/') || pageName.includes('\0')) {
    return { success: false, error: `publish: invalid page name` }
  }

  const dirEntry = context.fileSystem.getEntry(resolved)
  if (!dirEntry || dirEntry.type !== 'directory') {
    return { success: false, error: `publish: '${rawPath}' is not a directory` }
  }

  const htmlEntry = context.fileSystem.getEntry(`${resolved}/index.html`)
  if (!htmlEntry || htmlEntry.type !== 'file') {
    return { success: false, error: `publish: '${rawPath}' must contain an index.html file` }
  }

  return {
    success: true,
    data: {
      publishPageName: pageName,
      output: `Publishing /wwwroot/${pageName}/ ...`,
    },
  }
}

export const effect: CommandEffect = (result, context) => {
  if (!result.success || !result.data?.publishPageName) {
    return 'continue'
  }

  const name = result.data.publishPageName

  ;(publishPage as any)({ data: { pageName: name } })
    .then((data: any) => {
      if (data.error) {
        context.addLine('error', `publish: ${data.error}`)
        return
      }
      context.addLine('output', `Published! Visit /${name}`)
    })
    .catch((err: Error) => {
      context.addLine('error', `publish: ${err.message}`)
    })

  return 'handled'
}
