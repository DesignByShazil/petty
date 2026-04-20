import { generateReminderTimes } from '@/lib/reminders/schedule'
import type { ReminderInsert } from '@/lib/db/types'

export const DEFAULT_HORIZON_DAYS = 7

/**
 * Build the reminder rows for a medication. Used on medication insert and
 * when a medication is reactivated or its schedule changes.
 */
export function remindersForMedication(args: {
  petId: string
  medicationId: string
  medicationName: string
  schedule: string | null
  startDate: string | null
  endDate?: string | null
  now?: Date
  horizonDays?: number
}): ReminderInsert[] {
  const start = args.startDate ? new Date(args.startDate) : (args.now ?? new Date())
  const now = args.now ?? new Date()
  // Never schedule reminders before "now" even if start_date is in the past.
  const effectiveStart = start.getTime() < now.getTime() ? now : start
  const endDate = args.endDate ? new Date(args.endDate) : null
  const horizon = args.horizonDays ?? DEFAULT_HORIZON_DAYS

  const times = generateReminderTimes(args.schedule, effectiveStart, horizon, endDate)
  return times.map((due) => ({
    pet_id: args.petId,
    medication_id: args.medicationId,
    kind: 'medication',
    title: args.medicationName,
    due_at: due.toISOString(),
  }))
}
