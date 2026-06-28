import type { CommandHandler } from './types'
import { PackageManager } from '../packageManager'

let pm: PackageManager | null = null

function getPM(): PackageManager {
  if (!pm) pm = new PackageManager()
  return pm
}

export const MANUAL = `pkg — Package manager

Usage:
  pkg update              Refresh package index
  pkg install <name>      Install a package
  pkg remove <name>       Remove a package
  pkg list                Show installed packages
  pkg search <term>       Search packages
  pkg info <name>         Show package details`

export const HELP_TEXT = 'Package manager'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'pkg: missing subcommand' }
  }

  const subcommand = args[0]

  switch (subcommand) {
    case 'update': {
      return { success: true, data: { output: 'Updated package index: 5 packages available.' } }
    }

    case 'install': {
      if (!args[1]) return { success: false, error: 'pkg: missing package name' }
      try {
        getPM().install(args[1])
        return { success: true, data: { output: `Installed ${args[1]}` } }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }

    case 'remove': {
      if (!args[1]) return { success: false, error: 'pkg: missing package name' }
      getPM().uninstall(args[1])
      return { success: true, data: { output: `Removed ${args[1]}` } }
    }

    case 'list': {
      const installed = getPM().getInstalled()
      if (installed.length === 0) return { success: true, data: { output: 'No packages installed.' } }
      return { success: true, data: { output: installed.map((p) => `${p.name} ${p.version}`).join('\n') } }
    }

    case 'search': {
      if (!args[1]) return { success: false, error: 'pkg: missing search term' }
      const remote = getPM().listRemote()
      const results = remote.filter((p) => p.name.includes(args[1]) || p.description.includes(args[1]))
      if (results.length === 0) return { success: true, data: { output: `No packages matching '${args[1]}'` } }
      return { success: true, data: { output: results.map((p) => `${p.name} - ${p.description}`).join('\n') } }
    }

    case 'info': {
      if (!args[1]) return { success: false, error: 'pkg: missing package name' }
      const remote = getPM().listRemote()
      const pkg = remote.find((p) => p.name === args[1])
      if (!pkg) return { success: false, error: `package '${args[1]}' not found` }
      return { success: true, data: { output: `Package: ${pkg.name}\nVersion: ${pkg.version}\nDescription: ${pkg.description}` } }
    }

    default:
      return { success: false, error: `pkg: unknown subcommand '${subcommand}'` }
  }
}
