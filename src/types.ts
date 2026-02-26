export type Operation = 'INSERT' | 'UPDATE' | 'DELETE'

export type SyncStatus = 'success' | 'failed' | 'retrying'

export interface Student {
  id: number
  fname: string
  lname: string
  email: string
}

export interface SyncPayload {
  type: Operation
  record?: Student
  old_record?: Student
}

export interface QueueMessage {
  operation: Operation
  record: Student
}