import type { CommandHandler } from './types'

export const MANUAL = `cal — Display a calendar

Usage:
  cal           Display current month
  cal <year>    Display specified year`

export const HELP_TEXT = 'Display a calendar'

export const handler: CommandHandler = (args, _context) => {
  const now = new Date()
  const year = args[0] ? parseInt(args[0], 10) || now.getFullYear() : now.getFullYear()
  const month = args.length < 2 ? now.getMonth() : (parseInt(args[1], 10) || 1) - 1

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month]

  let output = `    ${monthName} ${year}\nSu Mo Tu We Th Fr Sa\n`
  output += '   '.repeat(firstDay)
  for (let d = 1; d <= daysInMonth; d++) {
    output += String(d).padStart(2, ' ') + ' '
    if ((d + firstDay) % 7 === 0) output += '\n'
  }

  return { success: true, data: { output } }
}
