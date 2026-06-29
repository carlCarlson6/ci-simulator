// src/lib/tasks.ts
// Pure data model + reducer + display helpers for the `tasks` feature.
// Notes are plain files under /notes-app; tasks are records persisted in the
// per-user JSONB blob (and localStorage), referencing notes by absolute path.

export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done'

export type Task = {
  id: number
  title: string
  status: TaskStatus
  dueDate?: string // 'YYYY-MM-DD'
  notePaths: string[] // absolute paths under /notes-app
  createdAt: string // ISO
}

export type TasksState = {
  tasks: Task[]
  nextTaskId: number
}

export const NOTES_DIR = '/notes-app'

export const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'blocked', 'done']

export const STATUS_GLYPH: Record<TaskStatus, string> = {
  todo: '[ ]',
  doing: '[~]',
  blocked: '[!]',
  done: '[x]',
}

export const emptyTasksState = (): TasksState => ({ tasks: [], nextTaskId: 1 })

// ─── Operations (described by the pure handler, applied by the store) ────────

export type TaskOp =
  | { kind: 'add'; title: string; dueDate?: string }
  | { kind: 'status'; id: number; status: TaskStatus }
  | { kind: 'edit'; id: number; title?: string; dueDate?: string | null }
  | { kind: 'attach'; id: number; path: string }
  | { kind: 'detach'; id: number; path: string }
  | { kind: 'rm'; id: number }

export function reduceTaskOp(
  state: TasksState,
  op: TaskOp
): { state: TasksState; message: string } {
  switch (op.kind) {
    case 'add': {
      const id = state.nextTaskId
      const task: Task = {
        id,
        title: op.title,
        status: 'todo',
        dueDate: op.dueDate,
        notePaths: [],
        createdAt: new Date().toISOString(),
      }
      return {
        state: { tasks: [...state.tasks, task], nextTaskId: id + 1 },
        message: `Created task #${id}: ${op.title}`,
      }
    }
    case 'status':
      return mapTask(state, op.id, (t) => ({ ...t, status: op.status }), `#${op.id} → ${op.status}`)
    case 'edit':
      return mapTask(
        state,
        op.id,
        (t) => ({
          ...t,
          title: op.title ?? t.title,
          dueDate: op.dueDate === null ? undefined : op.dueDate ?? t.dueDate,
        }),
        `Updated task #${op.id}`
      )
    case 'attach':
      return mapTask(
        state,
        op.id,
        (t) =>
          t.notePaths.includes(op.path) ? t : { ...t, notePaths: [...t.notePaths, op.path] },
        `Attached ${op.path} to #${op.id}`
      )
    case 'detach':
      return mapTask(
        state,
        op.id,
        (t) => ({ ...t, notePaths: t.notePaths.filter((p) => p !== op.path) }),
        `Detached ${op.path} from #${op.id}`
      )
    case 'rm':
      return {
        state: { ...state, tasks: state.tasks.filter((t) => t.id !== op.id) },
        message: `Removed task #${op.id}`,
      }
  }
}

function mapTask(
  state: TasksState,
  id: number,
  fn: (t: Task) => Task,
  message: string
): { state: TasksState; message: string } {
  return {
    state: { ...state, tasks: state.tasks.map((t) => (t.id === id ? fn(t) : t)) },
    message,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const today = (): string => new Date().toISOString().slice(0, 10)

export function isValidDueDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(value + 'T00:00:00')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export function isOverdue(task: Task, ref: string = today()): boolean {
  return task.status !== 'done' && !!task.dueDate && task.dueDate < ref
}

export function findTask(tasks: Task[], id: number): Task | undefined {
  return tasks.find((t) => t.id === id)
}

export function statusOrder(status: TaskStatus): number {
  return TASK_STATUSES.indexOf(status)
}

export function nextStatus(status: TaskStatus): TaskStatus {
  return TASK_STATUSES[(TASK_STATUSES.indexOf(status) + 1) % TASK_STATUSES.length]
}

// Sort: incomplete first (todo/doing/blocked), then done; within a group by
// due date (undated last), then id.
export function sortedTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === 'done' ? 1 : 0
    const bDone = b.status === 'done' ? 1 : 0
    if (aDone !== bDone) return aDone - bDone
    const aDue = a.dueDate ?? '9999-99-99'
    const bDue = b.dueDate ?? '9999-99-99'
    if (aDue !== bDue) return aDue < bDue ? -1 : 1
    return a.id - b.id
  })
}

// Text rendering for `tasks ls`
export function renderTaskList(tasks: Task[], ref: string = today()): string {
  if (tasks.length === 0) {
    return 'No tasks. Use `tasks add "title" [--due YYYY-MM-DD]` to create one.'
  }
  const rows = sortedTasks(tasks).map((t) => {
    const id = `#${t.id}`.padEnd(4)
    const glyph = STATUS_GLYPH[t.status]
    const status = t.status.padEnd(7)
    const due = t.dueDate ? `due ${t.dueDate}` : ''.padEnd(14)
    const flags = [
      isOverdue(t, ref) ? '!OVERDUE' : '',
      t.notePaths.length ? `(${t.notePaths.length} note${t.notePaths.length > 1 ? 's' : ''})` : '',
    ]
      .filter(Boolean)
      .join(' ')
    return `${id} ${glyph} ${status} ${t.title}${due ? '  ' + due : ''}${flags ? '  ' + flags : ''}`
  })
  return [`${tasks.length} task(s):`, ...rows].join('\n')
}
