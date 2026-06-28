import { CommandHandler } from './types'
import { soundEngine } from '../soundEngine'

export const MANUAL = 'sound\n\nControl terminal sound effects.\n\nUsage: sound [on|off|volume <n>|status]\n\n  sound on           Enable sound effects\n  sound off          Disable sound effects\n  sound volume <n>   Set volume (0.0 – 1.0)\n  sound status       Show current sound settings\n  sound              Same as status'
export const HELP_TEXT = '  sound [on|off|volume] Control sound effects'

export const handler: CommandHandler = (args) => {
  const sub = args[0]

  if (!sub || sub === 'status') {
    const state = soundEngine.getEnabled() ? 'ON' : 'OFF'
    const vol = soundEngine.getVolume().toFixed(1)
    return { success: true, data: { output: `Sound: ${state} (volume: ${vol})` } }
  }

  if (sub === 'on') {
    soundEngine.setEnabled(true)
    soundEngine.play('command')
    const saved = JSON.parse(localStorage.getItem('ci-simulator-sound') ?? '{}')
    localStorage.setItem('ci-simulator-sound', JSON.stringify({ ...saved, enabled: true }))
    return { success: true, data: { output: 'Sound effects enabled.' } }
  }

  if (sub === 'off') {
    soundEngine.setEnabled(false)
    const saved = JSON.parse(localStorage.getItem('ci-simulator-sound') ?? '{}')
    localStorage.setItem('ci-simulator-sound', JSON.stringify({ ...saved, enabled: false }))
    return { success: true, data: { output: 'Sound effects disabled.' } }
  }

  if (sub === 'volume') {
    const raw = parseFloat(args[1])
    if (isNaN(raw) || raw < 0 || raw > 1) {
      return { success: false, error: 'sound: volume must be a number between 0 and 1' }
    }
    soundEngine.setVolume(raw)
    const saved = JSON.parse(localStorage.getItem('ci-simulator-sound') ?? '{}')
    localStorage.setItem('ci-simulator-sound', JSON.stringify({ ...saved, volume: raw }))
    return { success: true, data: { output: `Volume set to ${raw.toFixed(1)}` } }
  }

  return { success: false, error: `sound: unknown subcommand '${sub}'. Usage: sound [on|off|volume <n>|status]` }
}
