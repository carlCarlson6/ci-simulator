import { CommandContext, CommandResult, CommandHandler, CommandEffect } from './types'
import { parsePipeline } from '../parser'

import { handler as helpHandler } from './help'
import { handler as clearHandler, effect as clearEffect } from './clear'
import { handler as lsHandler } from './ls'
import { handler as treeHandler } from './tree'
import { handler as gtreeHandler } from './gtree'
import { handler as cdHandler, effect as cdEffect } from './cd'
import { handler as pwdHandler } from './pwd'
import { handler as catHandler } from './cat'
import { handler as echoHandler } from './echo'
import { handler as mkdirHandler } from './mkdir'
import { handler as touchHandler } from './touch'
import { handler as rmHandler } from './rm'
import { handler as cpHandler } from './cp'
import { handler as mvHandler } from './mv'
import { handler as curlHandler, effect as curlEffect } from './curl'
import { handler as manHandler } from './man'
import { handler as cowsayHandler } from './cowsay'
import { handler as historyHandler } from './history'
import { handler as themeHandler } from './theme'
import { handler as editHandler, effect as editEffect } from './edit'
import { handler as mdHandler, effect as mdEffect } from './md'
import { handler as envHandler } from './env'
import { handler as exportHandler, effect as exportEffect } from './export'
import { handler as loginHandler } from './login'
import { handler as logoutHandler } from './logout'
import { handler as whoamiHandler } from './whoami'
import { handler as resetHandler, effect as resetEffect } from './reset'
import { handler as publishHandler, effect as publishEffect } from './publish'
import { handler as desktopHandler, effect as desktopEffect } from './desktop'
import { handler as psHandler } from './ps'
import { handler as killHandler } from './kill'
import { handler as killallHandler } from './killall'
import { handler as jobsHandler } from './jobs'
import { handler as bgHandler } from './bg'
import { handler as fgHandler } from './fg'
import { handler as disownHandler } from './disown'
import { handler as nohupHandler } from './nohup'
import { handler as waitHandler } from './wait'
import { handler as grepHandler } from './grep'
import { handler as sourceHandler } from './source'
import { handler as readHandler } from './read'
import { handler as testHandler } from './test'
import { handler as exitHandler, effect as exitEffect } from './exit'
import { handler as returnHandler } from './return'
import { handler as localHandler } from './local'
import { handler as aliasHandler } from './alias'
import { handler as chmodHandler } from './chmod'
import { handler as chownHandler } from './chown'
import { handler as lnHandler } from './ln'
import { handler as statHandler } from './stat'
import { handler as umaskHandler } from './umask'
import { handler as mountHandler } from './mount'
import { handler as unameHandler } from './uname'
import { handler as uptimeHandler } from './uptime'
import { handler as dateHandler } from './date'
import { handler as calHandler } from './cal'
import { handler as freeHandler } from './free'
import { handler as lscpuHandler } from './lscpu'
import { handler as lspciHandler } from './lspci'
import { handler as lsblkHandler } from './lsblk'
import { handler as dmesgHandler } from './dmesg'
import { handler as hostnameHandler } from './hostname'
import { handler as idHandler } from './id'
import { handler as dfHandler } from './df'
import { handler as duHandler } from './du'
import { handler as findHandler } from './find'
import { handler as wcHandler } from './wc'
import { handler as headHandler } from './head'
import { handler as tailHandler } from './tail'
import { handler as lessHandler } from './less'
import { handler as sortHandler } from './sort'
import { handler as uniqHandler } from './uniq'
import { handler as diffHandler } from './diff'
import { handler as timeHandler } from './time'
import { handler as fbdrawHandler } from './fbdraw'
import { handler as fbfillHandler } from './fbfill'
import { handler as fbtextHandler } from './fbtext'
import { handler as fbclearHandler } from './fbclear'
import { handler as fbsaveHandler } from './fbsave'
import { handler as fbviewHandler } from './fbview'
import { handler as pkgHandler } from './pkg'
import { handler as adduserHandler } from './adduser'
import { handler as deluserHandler } from './deluser'
import { handler as passwdHandler } from './passwd'
import { handler as suHandler } from './su'
import { handler as sudoHandler } from './sudo'
import { handler as groupsHandler } from './groups'
import { handler as groupaddHandler } from './groupadd'
import { handler as groupdelHandler } from './groupdel'
import { handler as whoHandler } from './who'
import { handler as usersHandler } from './users'
import { handler as lastHandler } from './last'
import { handler as writeHandler } from './write'
import { handler as wallHandler } from './wall'
import { handler as pingHandler } from './ping'
import { handler as netstatHandler } from './netstat'
import { handler as ssHandler } from './ss'
import { handler as ifconfigHandler } from './ifconfig'
import { handler as ipHandler } from './ip'
import { handler as routeHandler } from './route'
import { handler as tracerouteHandler } from './traceroute'
import { handler as nslookupHandler } from './nslookup'
import { handler as hostHandler } from './host'
import { handler as digHandler } from './dig'
import { handler as ncHandler } from './nc'
import { handler as listenHandler } from './listen'
import { handler as wgetHandler } from './wget'
import { handler as shutdownHandler, effect as shutdownEffect } from './shutdown'
import { handler as rebootHandler, effect as rebootEffect } from './reboot'
import { handler as haltHandler, effect as haltEffect } from './halt'
import { handler as sedHandler } from './sed'
import { handler as awkHandler } from './awk'
import { handler as tarHandler } from './tar'
import { handler as zipHandler } from './zip'
import { handler as unzipHandler } from './unzip'
import { handler as crontabHandler } from './crontab'
import { handler as atHandler } from './at'
import { handler as makeHandler } from './make'
import { handler as gitHandler } from './git'
import { handler as base64Handler } from './base64'
import { handler as sha256sumHandler } from './sha256sum'
import { handler as md5sumHandler } from './md5sum'
import { handler as patchHandler } from './patch'

const commands: Record<string, CommandHandler> = {
  help: helpHandler,
  clear: clearHandler,
  ls: lsHandler,
  tree: treeHandler,
  gtree: gtreeHandler,
  cd: cdHandler,
  pwd: pwdHandler,
  cat: catHandler,
  echo: echoHandler,
  mkdir: mkdirHandler,
  touch: touchHandler,
  rm: rmHandler,
  cp: cpHandler,
  mv: mvHandler,
  curl: curlHandler,
  man: manHandler,
  cowsay: cowsayHandler,
  history: historyHandler,
  theme: themeHandler,
  edit: editHandler,
  md: mdHandler,
  env: envHandler,
  export: exportHandler,
  login: loginHandler,
  logout: logoutHandler,
  whoami: whoamiHandler,
  reset: resetHandler,
  publish: publishHandler,
  desktop: desktopHandler,
  ps: psHandler,
  kill: killHandler,
  killall: killallHandler,
  jobs: jobsHandler,
  bg: bgHandler,
  fg: fgHandler,
  disown: disownHandler,
  nohup: nohupHandler,
  wait: waitHandler,
  grep: grepHandler,
  source: sourceHandler,
  '.': sourceHandler,
  read: readHandler,
  test: testHandler,
  '[': testHandler,
  exit: exitHandler,
  return: returnHandler,
  local: localHandler,
  alias: aliasHandler,
  chmod: chmodHandler,
  chown: chownHandler,
  ln: lnHandler,
  stat: statHandler,
  umask: umaskHandler,
  mount: mountHandler,
  uname: unameHandler,
  uptime: uptimeHandler,
  date: dateHandler,
  cal: calHandler,
  free: freeHandler,
  lscpu: lscpuHandler,
  lspci: lspciHandler,
  lsblk: lsblkHandler,
  dmesg: dmesgHandler,
  hostname: hostnameHandler,
  id: idHandler,
  df: dfHandler,
  du: duHandler,
  find: findHandler,
  wc: wcHandler,
  head: headHandler,
  tail: tailHandler,
  less: lessHandler,
  sort: sortHandler,
  uniq: uniqHandler,
  diff: diffHandler,
  time: timeHandler,
  fbdraw: fbdrawHandler,
  fbfill: fbfillHandler,
  fbtext: fbtextHandler,
  fbclear: fbclearHandler,
  fbsave: fbsaveHandler,
  fbview: fbviewHandler,
  pkg: pkgHandler,
  adduser: adduserHandler,
  deluser: deluserHandler,
  passwd: passwdHandler,
  su: suHandler,
  sudo: sudoHandler,
  groups: groupsHandler,
  groupadd: groupaddHandler,
  groupdel: groupdelHandler,
  who: whoHandler,
  users: usersHandler,
  last: lastHandler,
  write: writeHandler,
  wall: wallHandler,
  ping: pingHandler,
  netstat: netstatHandler,
  ss: ssHandler,
  ifconfig: ifconfigHandler,
  ip: ipHandler,
  route: routeHandler,
  traceroute: tracerouteHandler,
  nslookup: nslookupHandler,
  host: hostHandler,
  dig: digHandler,
  nc: ncHandler,
  listen: listenHandler,
  wget: wgetHandler,
  shutdown: shutdownHandler,
  reboot: rebootHandler,
  halt: haltHandler,
  sed: sedHandler,
  awk: awkHandler,
  tar: tarHandler,
  zip: zipHandler,
  unzip: unzipHandler,
  crontab: crontabHandler,
  at: atHandler,
  make: makeHandler,
  git: gitHandler,
  base64: base64Handler,
  sha256sum: sha256sumHandler,
  md5sum: md5sumHandler,
  patch: patchHandler,
}

const commandEffects: Record<string, CommandEffect> = {
  clear: clearEffect,
  cd: cdEffect,
  curl: curlEffect,
  edit: editEffect,
  md: mdEffect,
  export: exportEffect,
  reset: resetEffect,
  publish: publishEffect,
  desktop: desktopEffect,
  exit: exitEffect,
  shutdown: shutdownEffect,
  reboot: rebootEffect,
  halt: haltEffect,
}

export type { CommandContext, CommandResult, CommandHandler, CommandEffect, CommandEffectContext } from './types'

export function expandVariables(input: string, envVars: Record<string, string>): string {
  return input.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, key) => envVars[key] ?? '')
}

function executeSingle(stage: { command: string; args: string[] }, context: CommandContext): CommandResult {
  const handler = commands[stage.command]
  if (!handler) {
    return { success: false, error: `${stage.command}: command not found` }
  }
  return handler(stage.args, context)
}

export function executeCommand(input: string, context: CommandContext): CommandResult {
  const trimmed = input.trim()

  const pipeline = parsePipeline(trimmed)

  if (pipeline.stages.length === 1 && !pipeline.redirect && !pipeline.inputRedirect) {
    const stage = pipeline.stages[0]
    const expanded = expandVariables(stage.args.join(' '), context.envVars)
    stage.args = expanded ? expanded.split(/\s+/) : []
    return executeSingle(stage, context)
  }

  let pipedOutput: string[] | undefined

  for (const stage of pipeline.stages) {
    const expanded = expandVariables(stage.args.join(' '), context.envVars)
    stage.args = expanded ? expanded.split(/\s+/) : []

    const stageContext: CommandContext = {
      ...context,
      pipedInput: pipedOutput,
    }

    const result = executeSingle(stage, stageContext)
    if (!result.success) return result

    pipedOutput = result.pipedOutput ?? (result.data?.output ? result.data.output.split('\n') : [])
  }

  if (pipeline.redirect) {
    const output = pipedOutput?.join('\n') ?? ''
    if (output) {
      try {
        context.fileSystem.writeFile(
          context.fileSystem.resolvePath(pipeline.redirect.path, context.currentPath),
          output
        )
      } catch {
        return { success: false, error: `redirect: cannot write to ${pipeline.redirect.path}` }
      }
    }
    return { success: true }
  }

  return {
    success: true,
    data: { output: pipedOutput?.join('\n') },
  }
}

export function getCompletionCandidates(
  input: string,
  context: Pick<CommandContext, 'fileSystem' | 'currentPath' | 'envVars'>
): string[] {
  const parts = input.trim().split(/\s+/)

  if (parts.length <= 1) {
    const partial = parts[0] || ''
    return Object.keys(commands).filter((cmd) => cmd.startsWith(partial))
  }

  const command = parts[0]

  if (command === 'env' && parts.length === 2) {
    const partial = parts[1]
    return Object.keys(context.envVars).filter((key) => key.startsWith(partial))
  }

  const partial = parts[parts.length - 1]
  const resolved = context.fileSystem.resolvePath(partial, context.currentPath)

  let dir: string
  let prefix: string

  if (partial.endsWith('/')) {
    dir = resolved
    prefix = ''
  } else {
    dir = context.fileSystem.getParent(resolved)
    prefix = context.fileSystem.getName(resolved)
  }

  try {
    const entries = context.fileSystem.listDirectory(dir)
    const candidates = entries.filter((entry) => entry.startsWith(prefix))

    return candidates.map((entry) => {
      const fullPath = dir === '/' ? '/' + entry : dir + '/' + entry
      return context.fileSystem.getEntry(fullPath)?.type === 'directory' ? entry + '/' : entry
    })
  } catch {
    return []
  }
}

export function getCommandEffect(command: string): CommandEffect | undefined {
  return commandEffects[command]
}

export function getCommands(): string[] {
  return Object.keys(commands)
}

export function registerCommand(name: string, handler: CommandHandler): void {
  commands[name] = handler
}

export function unregisterCommand(name: string): void {
  delete commands[name]
}
