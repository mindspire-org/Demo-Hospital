import { ActivityLog } from '../models/ActivityLog'

export interface ActivityLogData {
  userId: string
  userName?: string
  portal: string
  action: string
  module?: string
  entityId?: string
  entityLabel?: string
  amount?: number
  method?: string
  meta?: any
}

export async function logActivity(data: ActivityLogData) {
  try {
    await ActivityLog.create(data)
  } catch {
    // Fire-and-forget: silently catch to avoid blocking financial operations
  }
}
