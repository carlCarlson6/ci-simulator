import { CommandHandler } from './types'
import { MANUAL as clearManual } from './clear'
import { MANUAL as lsManual } from './ls'
import { MANUAL as treeManual } from './tree'
import { MANUAL as gtreeManual } from './gtree'
import { MANUAL as cdManual } from './cd'
import { MANUAL as pwdManual } from './pwd'
import { MANUAL as catManual } from './cat'
import { MANUAL as echoManual } from './echo'
import { MANUAL as mkdirManual } from './mkdir'
import { MANUAL as touchManual } from './touch'
import { MANUAL as rmManual } from './rm'
import { MANUAL as cpManual } from './cp'
import { MANUAL as mvManual } from './mv'
import { MANUAL as curlManual } from './curl'
import { MANUAL as cowsayManual } from './cowsay'
import { MANUAL as historyManual } from './history'
import { MANUAL as themeManual } from './theme'
import { MANUAL as mdManual } from './md'

const manPages: Record<string, string> = {
  help: 'help\n\nShow available commands and brief descriptions.\n\nUsage: help',
  clear: clearManual,
  ls: lsManual,
  tree: treeManual,
  gtree: gtreeManual,
  cd: cdManual,
  pwd: pwdManual,
  cat: catManual,
  echo: echoManual,
  mkdir: mkdirManual,
  touch: touchManual,
  rm: rmManual,
  cp: cpManual,
  mv: mvManual,
  curl: curlManual,
  man: 'man\n\nDisplay manual pages for commands.\n\nUsage: man <command>',
  cowsay: cowsayManual,
  history: historyManual,
  theme: themeManual,
  md: mdManual,
}

export const MANUAL = 'man\n\nDisplay manual pages for commands.\n\nUsage: man <command>'
export const HELP_TEXT = '  man <command>         Show manual page'

export const handler: CommandHandler = (args) => {
  if (args.length === 0) {
    return { success: false, error: 'man: What manual page do you want?' }
  }

  const page = manPages[args[0]]
  if (!page) {
    return { success: false, error: `man: No manual entry for ${args[0]}` }
  }

  return { success: true, data: { output: page } }
}
