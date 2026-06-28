import type { CommandHandler } from './types'

export const MANUAL = `test — Condition testing

Usage:
  test -f <file>     True if file exists and is a regular file
  test -d <dir>      True if directory exists
  test -e <path>     True if path exists
  test -z <string>   True if string is empty
  test -n <string>   True if string is not empty
  test <a> = <b>     True if strings equal
  test <a> != <b>    True if strings not equal
  test <a> -eq <b>   True if numbers equal
  test <a> -ne <b>   True if numbers not equal
  test <a> -lt <b>   True if a < b
  test <a> -gt <b>   True if a > b
  [ <expr> ]         Alias for test`

export const HELP_TEXT = 'Condition testing'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'test: missing operand' }
  }

  if (args[0] === '-f') {
    if (!args[1]) return { success: false, error: 'test: missing operand' }
    try {
      const resolved = context.fileSystem.resolvePath(args[1], context.currentPath)
      const entry = context.fileSystem.getEntry(resolved)
      return { success: entry?.type === 'file', data: { output: '' } }
    } catch {
      return { success: false, data: { output: '' } }
    }
  }

  if (args[0] === '-d') {
    if (!args[1]) return { success: false, error: 'test: missing operand' }
    try {
      const resolved = context.fileSystem.resolvePath(args[1], context.currentPath)
      const entry = context.fileSystem.getEntry(resolved)
      return { success: entry?.type === 'directory', data: { output: '' } }
    } catch {
      return { success: false, data: { output: '' } }
    }
  }

  if (args[0] === '-e') {
    if (!args[1]) return { success: false, error: 'test: missing operand' }
    try {
      const resolved = context.fileSystem.resolvePath(args[1], context.currentPath)
      const entry = context.fileSystem.getEntry(resolved)
      return { success: !!entry, data: { output: '' } }
    } catch {
      return { success: false, data: { output: '' } }
    }
  }

  if (args[0] === '-z') {
    return { success: (args[1] || '') === '', data: { output: '' } }
  }

  if (args[0] === '-n') {
    return { success: (args[1] || '') !== '', data: { output: '' } }
  }

  if (args.length >= 3) {
    if (args[1] === '=') {
      return { success: args[0] === args[2], data: { output: '' } }
    }
    if (args[1] === '!=') {
      return { success: args[0] !== args[2], data: { output: '' } }
    }
    if (args[1] === '-eq') {
      return { success: parseInt(args[0], 10) === parseInt(args[2], 10), data: { output: '' } }
    }
    if (args[1] === '-ne') {
      return { success: parseInt(args[0], 10) !== parseInt(args[2], 10), data: { output: '' } }
    }
    if (args[1] === '-lt') {
      return { success: parseInt(args[0], 10) < parseInt(args[2], 10), data: { output: '' } }
    }
    if (args[1] === '-gt') {
      return { success: parseInt(args[0], 10) > parseInt(args[2], 10), data: { output: '' } }
    }
    if (args[1] === '-le') {
      return { success: parseInt(args[0], 10) <= parseInt(args[2], 10), data: { output: '' } }
    }
    if (args[1] === '-ge') {
      return { success: parseInt(args[0], 10) >= parseInt(args[2], 10), data: { output: '' } }
    }
  }

  return { success: false, error: 'test: invalid arguments' }
}
