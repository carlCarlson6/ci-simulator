import type { CommandHandler } from './types'

export const MANUAL = `disown — Remove a job from the shell's job table

Usage:
  disown %<job-number>  Remove job
  disown                Remove current background job`

export const HELP_TEXT = 'Remove job from job table'

export const handler: CommandHandler = (args, context) => {
  return { success: true, data: { output: '' } }
}
