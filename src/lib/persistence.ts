// src/lib/persistence.ts
import { FileSystem, FileSystemEntry } from './fileSystem'
import type { TasksState } from './tasks'
import { emptyTasksState } from './tasks'

const STORAGE_KEY = 'ci-simulator:filesystem'
const STORAGE_VERSION = 1
const TASKS_KEY = 'ci-simulator:tasks'

type PersistedFileSystem = {
  version: number
  entries: [string, FileSystemEntry][]
}

export function saveFileSystem(fs: FileSystem): void {
  try {
    const payload: PersistedFileSystem = {
      version: STORAGE_VERSION,
      entries: fs.serialize(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Silently ignore quota errors or private-mode restrictions
  }
}

export function loadFileSystem(): [string, FileSystemEntry][] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as PersistedFileSystem

    if (
      typeof parsed.version !== 'number' ||
      parsed.version !== STORAGE_VERSION ||
      !Array.isArray(parsed.entries)
    ) {
      return null
    }

    // Validate each entry has the expected shape
    for (const [path, entry] of parsed.entries) {
      if (typeof path !== 'string' || !entry || !['file', 'directory'].includes(entry.type)) {
        return null
      }
    }

    return parsed.entries
  } catch {
    return null
  }
}

export function clearFileSystemStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}

export function saveTasks(state: TasksState): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(state))
  } catch {
    // Silently ignore quota errors or private-mode restrictions
  }
}

export function loadTasks(): TasksState {
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    if (!raw) return emptyTasksState()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.tasks) || typeof parsed.nextTaskId !== 'number') {
      return emptyTasksState()
    }
    return { tasks: parsed.tasks, nextTaskId: parsed.nextTaskId }
  } catch {
    return emptyTasksState()
  }
}
