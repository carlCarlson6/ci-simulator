import type { CommandHandler } from './types'

export const MANUAL = `find — Search for files in a directory hierarchy

Usage:
  find <path> -name <pattern>     Find files by name
  find <path> -type <type>        Find by type (f=file, d=directory)`

export const HELP_TEXT = 'Search for files in directory hierarchy'

export const handler: CommandHandler = (args, context) => {
  const targetArg = args.find((a) => !a.startsWith('-')) || '.'
  const nameIdx = args.indexOf('-name')
  const typeIdx = args.indexOf('-type')
  const pattern = nameIdx >= 0 ? args[nameIdx + 1] : null
  const typeFilter = typeIdx >= 0 ? args[typeIdx + 1] : null

  try {
    const target = context.fileSystem.resolvePath(targetArg, context.currentPath)
    const results: string[] = []

    for (const [key, entry] of context.fileSystem.entries) {
      if (!key.startsWith(target)) continue
      if (key === target) continue

      const name = key.split('/').pop() || ''

      if (pattern) {
        const re = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'))
        if (!re.test(name)) continue
      }

      if (typeFilter) {
        const typeMap: Record<string, string> = { f: 'file', d: 'directory', l: 'link' }
        if (entry.type !== (typeMap[typeFilter] || typeFilter)) continue
      }

      results.push(key)
    }

    return { success: true, data: { output: results.join('\n') || '' } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
