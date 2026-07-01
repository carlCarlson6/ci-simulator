import { CommandHandler, CommandEffect } from './types'

export const MANUAL =
  'desktop\n\nLaunch the graphical desktop environment.\n\nUsage: desktop\n  Opens /desktop — same file system, tasks and theme, windowed UI.\n  The taskbar TTY button (or navigating to /) returns to the terminal.'
export const HELP_TEXT = '  desktop               Launch the graphical desktop (/desktop)'

export const handler: CommandHandler = () => ({
  success: true,
  data: {
    output: 'Starting desktop environment...',
    navigateTo: '/desktop',
  },
})

export const effect: CommandEffect = (result) => {
  if (result.success && result.data?.navigateTo) {
    window.location.assign(result.data.navigateTo)
  }
  return 'continue'
}
