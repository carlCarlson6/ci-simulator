import { pgTable, text, jsonb, timestamp, serial } from 'drizzle-orm/pg-core'
import type { Task } from '../tasks'

export type ServerStatePayload = {
  v: 1
  fileSystem: [string, { type: 'file' | 'directory'; content?: string }][]
  currentPath: string
  theme: string
  envVars: Record<string, string>
  sound?: { enabled: boolean; volume: number }
  tasks?: Task[]
  nextTaskId?: number
}

export const userState = pgTable('virtual_terminal_user_state', {
  userId: text('user_id').primaryKey(),
  data: jsonb('data').$type<ServerStatePayload>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const staticPages = pgTable('static_pages', {
  id: serial('id').primaryKey(),
  pageName: text('page_name').notNull().unique(),
  ownerUserId: text('owner_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
