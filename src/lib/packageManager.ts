export type Package = {
  name: string
  version: string
  description: string
  handlerCode: string
  dependencies: string[]
  permissions: ('filesystem' | 'network' | 'auth' | 'process')[]
}

const BUILTIN_REGISTRY: Package[] = [
  {
    name: 'figlet',
    version: '1.0.0',
    description: 'ASCII art banner generator',
    handlerCode: '',
    dependencies: [],
    permissions: [],
  },
  {
    name: 'cmatrix',
    version: '1.0.0',
    description: 'Matrix rain screensaver',
    handlerCode: '',
    dependencies: ['fbclear'],
    permissions: [],
  },
  {
    name: 'cowsay',
    version: '1.0.0',
    description: 'Configurable talking cow',
    handlerCode: '',
    dependencies: [],
    permissions: [],
  },
  {
    name: 'curl',
    version: '1.0.0',
    description: 'Transfer data from URLs',
    handlerCode: '',
    dependencies: [],
    permissions: ['network'],
  },
  {
    name: 'figlet',
    version: '1.0.0',
    description: 'ASCII art banner generator',
    handlerCode: '',
    dependencies: [],
    permissions: [],
  },
]

export class PackageManager {
  private installed: Map<string, Package> = new Map()

  listRemote(): Package[] {
    return BUILTIN_REGISTRY
  }

  install(name: string): void {
    const pkg = BUILTIN_REGISTRY.find((p) => p.name === name)
    if (!pkg) throw new Error(`package '${name}' not found in registry`)
    this.installed.set(name, pkg)
  }

  uninstall(name: string): void {
    this.installed.delete(name)
  }

  getInstalled(): Package[] {
    return Array.from(this.installed.values())
  }

  get(name: string): Package | undefined {
    return this.installed.get(name)
  }

  has(name: string): boolean {
    return this.installed.has(name)
  }

  getPermissions(name: string): string[] {
    const pkg = this.installed.get(name)
    return pkg?.permissions ?? []
  }
}
