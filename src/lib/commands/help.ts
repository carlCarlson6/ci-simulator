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
import { HELP_TEXT as envHelp } from './env'
import { HELP_TEXT as exportHelp } from './export'
import { HELP_TEXT as loginHelp } from './login'
import { HELP_TEXT as logoutHelp } from './logout'
import { HELP_TEXT as whoamiHelp } from './whoami'
import { HELP_TEXT as resetHelp } from './reset'
import { HELP_TEXT as publishHelp } from './publish'
import { HELP_TEXT as pagesHelp } from './pages'
import { HELP_TEXT as soundHelp } from './sound'
import { HELP_TEXT as tasksHelp } from './tasks'
import { HELP_TEXT as notesHelp } from './notes'
import { HELP_TEXT as desktopHelp } from './desktop'

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
      loginHelp,
      logoutHelp,
      whoamiHelp,
      '',
      'Productivity:',
      tasksHelp,
      notesHelp,
      '  Notes are files under /notes-app. Tasks track title, status,',
      '  due date and attached notes.',
      '',
      'General Commands:',
      '  help                  Show this help message',
      desktopHelp,
      clearHelp,
      echoHelp,
      envHelp,
      exportHelp,
      historyHelp,
      resetHelp,
      themeHelp,
      soundHelp,
      '  man <command>         Show manual page',
      '',
      'Fun Commands:',
      cowsayHelp,
      '',
      'Web Pages (wwwroot):',
      publishHelp,
      pagesHelp,
      '  Create pages under /wwwroot/<name>/ with index.html and',
      '  optional style.css, then publish to make them public.',
    ].join('\n'),
  },
})
