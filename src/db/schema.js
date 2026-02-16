import { pgTable, serial, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'

// DB 1: Source table (normalized columns)
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  fname: text('fname').notNull(),
  lname: text('lname').notNull(),
  email: text('email').notNull().unique()
})

// DB 2: Target table (JSONB format)
export const studentsSync = pgTable('students_sync', {
  id: integer('id').primaryKey(),
  data: jsonb('data').notNull()
})

// Sync logs table (tracks all operations)
export const syncLogs = pgTable('sync_logs', {
  id: serial('id').primaryKey(),
  recordId: integer('record_id').notNull(),
  operation: text('operation').notNull(), // 'INSERT', 'UPDATE', 'DELETE'
  status: text('status').notNull(), // 'success', 'failed', 'retrying'
  error: text('error'),
  timestamp: timestamp('timestamp').defaultNow().notNull()
})