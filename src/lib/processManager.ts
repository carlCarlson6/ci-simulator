export type ProcessState = 'running' | 'sleeping' | 'stopped' | 'zombie'

export type Process = {
  pid: number
  ppid: number
  command: string
  args: string[]
  state: ProcessState
  startedAt: number
  exitCode: number | null
  foreground: boolean
  session: number
}

class ProcessManager {
  private processes: Map<number, Process> = new Map()
  private nextPid: number = 1

  spawn(ppid: number, command: string, args: string[], foreground: boolean): number {
    const pid = this.nextPid++
    this.processes.set(pid, {
      pid,
      ppid,
      command,
      args,
      state: 'running',
      startedAt: Date.now(),
      exitCode: null,
      foreground,
      session: ppid,
    })
    return pid
  }

  get(pid: number): Process | undefined {
    return this.processes.get(pid)
  }

  kill(pid: number, signal: number): boolean {
    const proc = this.processes.get(pid)
    if (!proc) return false

    if (signal === 9 || signal === 15) {
      proc.state = 'zombie'
      proc.exitCode = signal === 9 ? 137 : 143
    } else if (signal === 19 || signal === 20) {
      proc.state = 'stopped'
    } else if (signal === 18) {
      proc.state = 'running'
    }
    return true
  }

  list(): Process[] {
    return Array.from(this.processes.values())
  }

  getBySession(session: number): Process[] {
    return Array.from(this.processes.values()).filter((p) => p.session === session)
  }

  getByCommand(name: string): Process[] {
    return Array.from(this.processes.values()).filter((p) => p.command === name)
  }

  wait(pid: number): Promise<number> {
    return new Promise((resolve) => {
      const check = () => {
        const proc = this.processes.get(pid)
        if (proc && (proc.state === 'zombie' || proc.exitCode !== null)) {
          resolve(proc.exitCode ?? 0)
        } else {
          setTimeout(check, 50)
        }
      }
      check()
    })
  }

  setExit(pid: number, exitCode: number): void {
    const proc = this.processes.get(pid)
    if (proc) {
      proc.state = 'zombie'
      proc.exitCode = exitCode
    }
  }

  getNextPid(): number {
    return this.nextPid
  }
}

export { ProcessManager }
