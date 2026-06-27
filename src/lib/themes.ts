export type Theme = {
  name: string
  label: string
  colors: {
    bg: string
    text: string
    textDim: string
    textDark: string
    error: string
    blue: string
    yellow: string
    cyan: string
    magenta: string
  }
}

const cyberpunk: Theme = {
  name: 'cyberpunk',
  label: 'Cyberpunk',
  colors: {
    bg: '#000000',
    text: '#00ff00',
    textDim: '#006600',
    textDark: '#00aa00',
    error: '#ff0044',
    blue: '#0099ff',
    yellow: '#ffcc00',
    cyan: '#00ffff',
    magenta: '#ff00ff',
  },
}

const amber: Theme = {
  name: 'amber',
  label: 'Amber CRT',
  colors: {
    bg: '#1a0f00',
    text: '#ffb000',
    textDim: '#664400',
    textDark: '#aa7700',
    error: '#ff3300',
    blue: '#ffaa33',
    yellow: '#ffcc66',
    cyan: '#ffdd88',
    magenta: '#ff8800',
  },
}

const phosphor: Theme = {
  name: 'phosphor',
  label: 'Phosphor',
  colors: {
    bg: '#0a0a0a',
    text: '#c0c0c0',
    textDim: '#505050',
    textDark: '#808080',
    error: '#ff5555',
    blue: '#87ceeb',
    yellow: '#e0e0e0',
    cyan: '#aaffff',
    magenta: '#ff99ff',
  },
}

const commodore: Theme = {
  name: 'commodore',
  label: 'Commodore 64',
  colors: {
    bg: '#352879',
    text: '#6c5eb5',
    textDim: '#2a1f5e',
    textDark: '#4a3a8a',
    error: '#ff4444',
    blue: '#8aa4ff',
    yellow: '#bbbbff',
    cyan: '#aaddff',
    magenta: '#cc88ff',
  },
}

const solarized: Theme = {
  name: 'solarized',
  label: 'Solarized Dark',
  colors: {
    bg: '#002b36',
    text: '#839496',
    textDim: '#586e75',
    textDark: '#657b83',
    error: '#dc322f',
    blue: '#268bd2',
    yellow: '#b58900',
    cyan: '#2aa198',
    magenta: '#d33682',
  },
}

export const themes: Theme[] = [cyberpunk, amber, phosphor, commodore, solarized]

export function getTheme(name: string): Theme | undefined {
  return themes.find((t) => t.name === name)
}

export function getDefaultTheme(): Theme {
  return cyberpunk
}
