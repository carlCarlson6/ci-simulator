import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core'

export type ServerStatePayload = {
  v: 1
  fileSystem: [string, { type: 'file' | 'directory'; content?: string }][]
  currentPath: string
  theme: string
  envVars: Record<string, string>
}

export const userState = pgTable('virtual_terminal_user_state', {
  userId: text('user_id').primaryKey(),
  data: jsonb('data').$type<ServerStatePayload>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
