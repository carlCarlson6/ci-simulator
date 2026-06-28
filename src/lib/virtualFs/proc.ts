export function generateProcCpuinfo(): string {
  return `processor\t: 0
vendor_id\t: CI-OS
cpu family\t: 1
model\t\t: Virtual
model name\t: CI-OS Virtual CPU @ 2.4GHz
stepping\t: 0
cpu MHz\t\t: 2400.000
cache size\t: 4096 KB
`
}

export function generateProcMeminfo(): string {
  return `MemTotal:        8388608 kB
MemFree:         4194304 kB
MemAvailable:    6291456 kB
Buffers:          262144 kB
Cached:          1048576 kB
`
}

export function generateProcUptime(): string {
  const uptime = Math.floor((Date.now() - ((window as any).__START_TIME || Date.now())) / 1000)
  return `${uptime}.00 ${Math.floor(uptime / 60)}.00\n`
}

export function generateProcVersion(): string {
  return `CI-OS version 1.0.0 (user@ci-simulator) (gcc version 14.2.0) #1 SMP Sun Jun 28 10:00:00 UTC 2026\n`
}

export function generateProcPidStatus(pid: number): string {
  return `Name:\tbash
State:\tR (running)
Pid:\t${pid}
PPid:\t0
Uid:\t1000\t1000\t1000\t1000
Gid:\t1000\t1000\t1000\t1000
`
}

export function generateProcPidCmdline(pid: number): string {
  return `bash\0`
}
