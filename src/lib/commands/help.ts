import { CommandHandler } from './types'
import { HELP_TEXT as lsHelp } from './ls'
import { HELP_TEXT as treeHelp } from './tree'
import { HELP_TEXT as gtreeHelp } from './gtree'
import { HELP_TEXT as cdHelp } from './cd'
import { HELP_TEXT as pwdHelp } from './pwd'
import { HELP_TEXT as catHelp } from './cat'
import { HELP_TEXT as mkdirHelp } from './mkdir'
import { HELP_TEXT as touchHelp } from './touch'
import { HELP_TEXT as rmHelp } from './rm'
import { HELP_TEXT as cpHelp } from './cp'
import { HELP_TEXT as mvHelp } from './mv'
import { HELP_TEXT as curlHelp } from './curl'
import { HELP_TEXT as clearHelp } from './clear'
import { HELP_TEXT as echoHelp } from './echo'
import { HELP_TEXT as historyHelp } from './history'
import { HELP_TEXT as cowsayHelp } from './cowsay'
import { HELP_TEXT as themeHelp } from './theme'
import { HELP_TEXT as editHelp } from './edit'
import { HELP_TEXT as mdHelp } from './md'

export const MANUAL = 'help\n\nShow available commands and brief descriptions.\n\nUsage: help'
export const HELP_TEXT = '  help                  Show this help message'

export const handler: CommandHandler = () => ({
  success: true,
  data: {
    output: [
      'Terminal Simulator - Available Commands',
      '',
      'File System Commands:',
      lsHelp,
      treeHelp,
      gtreeHelp,
      cdHelp,
      pwdHelp,
      catHelp,
      mkdirHelp,
      touchHelp,
      editHelp,
      mdHelp,
      rmHelp,
      cpHelp,
      mvHelp,
      '',
      'System Commands:',
      curlHelp,
      '',
      'General Commands:',
      '  help                  Show this help message',
      clearHelp,
      echoHelp,
      historyHelp,
      themeHelp,
      '  man <command>         Show manual page',
      '',
      'Fun Commands:',
      cowsayHelp,
    ].join('\n'),
  },
})
