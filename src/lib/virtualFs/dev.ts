export function handleDevRead(path: string): string | null {
  switch (path) {
    case '/dev/null':
      return ''
    case '/dev/zero':
      return '\x00'
    case '/dev/random':
      return String(Math.random())
    case '/dev/stdin':
      return ''
    case '/dev/stdout':
      return ''
    case '/dev/stderr':
      return ''
    default:
      return null
  }
}

export const DEV_DEVICES = ['null', 'zero', 'random', 'stdin', 'stdout', 'stderr']
