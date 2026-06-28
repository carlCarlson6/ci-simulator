import type { CommandHandler } from './types'

export const MANUAL = `make — Build from Makefile

Usage:
  make             Build default target
  make <target>    Build specific target`

export const HELP_TEXT = 'Build from Makefile'

export const handler: CommandHandler = (args, _context) => {
  const target = args[0] || 'all'
  return { success: true, data: { output:
    `make: Entering directory '/projects'\n` +
    `cc    -c -o main.o main.c\n` +
    `cc   main.o   -o ${target}\n` +
    `make: Leaving directory '/projects'`
  } }
}
