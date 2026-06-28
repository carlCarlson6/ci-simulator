type SoundType = 'keystroke' | 'command' | 'error' | 'tabcomplete'

class SoundEngine {
  private audioCtx: AudioContext | null = null
  private enabled: boolean = false
  private volume: number = 0.3

  init(): void {
    if (this.audioCtx) return
    this.audioCtx = new AudioContext()
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number): void {
    if (!this.enabled || !this.audioCtx) return
    const ctx = this.audioCtx
    if (ctx.state === 'suspended') ctx.resume()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(vol * this.volume, ctx.currentTime + 0.005)
    gain.gain.setValueAtTime(vol * this.volume, ctx.currentTime + duration - 0.01)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  }

  play(type: SoundType): void {
    if (!this.enabled || !this.audioCtx) return
    switch (type) {
      case 'keystroke':
        this.playTone(800, 'sine', 0.02, 0.05)
        break
      case 'command':
        this.playTone(400, 'square', 0.05, 0.15)
        break
      case 'error':
        this.playTone(200, 'sawtooth', 0.15, 0.2)
        break
      case 'tabcomplete':
        this.playTone(1000, 'sine', 0.03, 0.08)
        break
    }
  }

  setEnabled(val: boolean): void {
    if (val && !this.audioCtx) this.init()
    this.enabled = val
  }

  setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val))
  }

  getEnabled(): boolean {
    return this.enabled
  }

  getVolume(): number {
    return this.volume
  }
}

export const soundEngine = new SoundEngine()
