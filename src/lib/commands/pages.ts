import { listMyPages } from '../server-fns'
import { CommandHandler, CommandEffect } from './types'

export const MANUAL = `pages

List the static web pages you have published.

Usage: pages

Shows each published page name and the date it was published.
Pages are publicly accessible at /<pageName>.`

export const HELP_TEXT = '  pages                 List your published static pages'

export const handler: CommandHandler = (_args, context) => {
  if (!context.user) {
    return { success: false, error: 'You must be logged in to list your pages' }
  }

  return { success: true, data: { listPages: true } }
}

export const effect: CommandEffect = (result, context) => {
  if (!result.success || !result.data?.listPages) {
    return 'continue'
  }

  listMyPages()
    .then((data: any) => {
      if (data.error) {
        context.addLine('error', `pages: ${data.error}`)
        return
      }

      const pages = (data.pages ?? []) as {
        pageName: string
        createdAt: string
        status: 'ok' | 'missing-dir' | 'missing-index'
      }[]
      if (pages.length === 0) {
        context.addLine('output', 'No published pages. Use `publish <path>` to publish one.')
        return
      }

      const statusLabel = (s: string) =>
        s === 'ok'
          ? 'OK'
          : s === 'missing-dir'
            ? 'BROKEN (missing /wwwroot/ directory)'
            : 'BROKEN (missing index.html)'

      const rows = pages.map(
        (p) =>
          `  /${p.pageName}    [${statusLabel(p.status)}]    published ${p.createdAt.slice(0, 10)}`
      )
      context.addLine('output', [`${pages.length} published page(s):`, ...rows].join('\n'))
    })
    .catch((err: Error) => {
      context.addLine('error', `pages: ${err.message}`)
    })

  return 'handled'
}
