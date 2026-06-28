import type { CommandHandler } from './types'

export const MANUAL = `git — Version control system

Usage:
  git init              Initialize repository
  git add <file>        Stage file
  git commit -m "msg"   Commit changes
  git log               Show commit log
  git status            Show working tree status
  git diff              Show changes
  git branch            List branches
  git checkout <branch> Switch branches
  git config            Get/set configuration`

export const HELP_TEXT = 'Version control system'

const gitState: {
  repos: Record<string, { files: Record<string, string>; commits: { hash: string; msg: string; date: string }[]; branch: string; branches: string[] }>
} = { repos: {} }

function getRepo(path: string) {
  if (!gitState.repos[path]) {
    gitState.repos[path] = { files: {}, commits: [], branch: 'main', branches: ['main'] }
  }
  return gitState.repos[path]
}

function shortHash(): string {
  return Math.random().toString(16).slice(2, 9)
}

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'git: missing subcommand' }
  }

  const subcommand = args[0]
  const repo = getRepo(context.currentPath)

  switch (subcommand) {
    case 'init': {
      try {
        context.fileSystem.createDirectory(context.currentPath + '/.git')
        return { success: true, data: { output: `Initialized empty Git repository in ${context.currentPath}/.git/` } }
      } catch {
        return { success: true, data: { output: `Reinitialized existing Git repository in ${context.currentPath}/.git/` } }
      }
    }

    case 'add': {
      if (args.length < 2) return { success: false, error: 'git: missing file operand' }
      try {
        const resolved = context.fileSystem.resolvePath(args[1], context.currentPath)
        const content = context.fileSystem.readFile(resolved)
        repo.files[args[1]] = content
      } catch {
        repo.files[args[1]] = ''
      }
      return { success: true, data: { output: '' } }
    }

    case 'commit': {
      const msgIdx = args.indexOf('-m')
      const msg = msgIdx >= 0 ? args.slice(msgIdx + 1).join(' ') : 'commit'
      const hash = shortHash()
      repo.commits.push({ hash, msg, date: new Date().toISOString() })
      return { success: true, data: { output: `[${repo.branch} ${hash}] ${msg}\n 1 file changed, 1 insertion(+)` } }
    }

    case 'log': {
      if (repo.commits.length === 0) return { success: true, data: { output: 'fatal: your current branch \'main\' does not have any commits yet' } }
      const log = repo.commits.map((c) =>
        `commit ${c.hash}\nAuthor: User <user@ci-simulator>\nDate:   ${c.date}\n\n    ${c.msg}`
      ).join('\n\n')
      return { success: true, data: { output: log } }
    }

    case 'status': {
      const lines = [`On branch ${repo.branch}`]
      if (repo.commits.length === 0) {
        lines.push('No commits yet')
      }
      if (Object.keys(repo.files).length > 0) {
        lines.push('Changes to be committed:', ...Object.keys(repo.files).map((f) => `  new file:   ${f}`))
      }
      return { success: true, data: { output: lines.join('\n') } }
    }

    case 'diff': {
      return { success: true, data: { output: 'diff --git a/file b/file\nnew file mode 100644\nindex 0000000..abc1234\n--- /dev/null\n+++ b/file\n@@ -0,0 +1 @@\n+content' } }
    }

    case 'branch': {
      const lines = repo.branches.map((b) => b === repo.branch ? `* ${b}` : `  ${b}`)
      return { success: true, data: { output: lines.join('\n') } }
    }

    case 'checkout': {
      if (args.length < 2) return { success: false, error: 'git: missing branch name' }
      if (!repo.branches.includes(args[1])) {
        repo.branches.push(args[1])
      }
      repo.branch = args[1]
      return { success: true, data: { output: `Switched to branch '${repo.branch}'` } }
    }

    case 'config': {
      return { success: true, data: { output: 'user.name=User\nuser.email=user@ci-simulator' } }
    }

    default:
      return { success: false, error: `git: '${subcommand}' is not a git command` }
  }
}
