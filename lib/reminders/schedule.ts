/**
 * Parse a free-form medication `schedule` string into a number of doses per day.
 * The schedule field is plain text today (e.g. "twice daily", "every 8 hours"),
 * so this is a pragmatic parser — unknown shapes fall back to once-daily.
 */

const WORD_TO_NUMBER: Record<string, number> = {
  once: 1,
  one: 1,
  twice: 2,
  two: 2,
  three: 3,
  thrice: 3,
  four: 4,
  five: 5,
  six: 6,
}

export type ParsedSchedule = {
  /** How many doses per day the medication calls for. */
  dosesPerDay: number
  /** Default hours (local) at which doses should fire, length === dosesPerDay. */
  hours: number[]
  /** What matched the input; useful for UI hints. */
  reason: 'explicit-count' | 'per-hours' | 'daily' | 'default'
}

const DEFAULT_HOURS: Record<number, number[]> = {
  1: [9],
  2: [9, 21],
  3: [8, 14, 20],
  4: [6, 12, 18, 22],
  5: [6, 10, 14, 18, 22],
  6: [6, 10, 12, 14, 18, 22],
}

function hoursFor(dosesPerDay: number): number[] {
  return DEFAULT_HOURS[dosesPerDay] ?? DEFAULT_HOURS[1]
}

export function parseSchedule(schedule: string | null | undefined): ParsedSchedule {
  const raw = (schedule ?? '').toLowerCase().trim()
  if (!raw) return { dosesPerDay: 1, hours: hoursFor(1), reason: 'default' }

  // "every N hours"
  const everyN = raw.match(/every\s+(\d+)\s*h(our)?s?/)
  if (everyN) {
    const hours = Math.max(1, Number(everyN[1]))
    const doses = Math.max(1, Math.min(6, Math.round(24 / hours)))
    return { dosesPerDay: doses, hours: hoursFor(doses), reason: 'per-hours' }
  }

  // "Nx daily" or "N per day" or "N times a day"
  const numeric = raw.match(/(\d+)\s*(x|times?)?\s*(per\s*day|\/\s*day|daily|a\s*day)/)
  if (numeric) {
    const n = Math.max(1, Math.min(6, Number(numeric[1])))
    return { dosesPerDay: n, hours: hoursFor(n), reason: 'explicit-count' }
  }

  // "twice daily", "three times daily"
  for (const [word, n] of Object.entries(WORD_TO_NUMBER)) {
    if (raw.includes(word) && /(daily|a day|per day)/.test(raw)) {
      return { dosesPerDay: n, hours: hoursFor(n), reason: 'explicit-count' }
    }
  }

  if (/(daily|once a day|every day|qd)/.test(raw)) {
    return { dosesPerDay: 1, hours: hoursFor(1), reason: 'daily' }
  }

  if (/(twice|bid|b\.?i\.?d)/.test(raw)) {
    return { dosesPerDay: 2, hours: hoursFor(2), reason: 'explicit-count' }
  }

  if (/(tid|t\.?i\.?d|three times)/.test(raw)) {
    return { dosesPerDay: 3, hours: hoursFor(3), reason: 'explicit-count' }
  }

  return { dosesPerDay: 1, hours: hoursFor(1), reason: 'default' }
}

/**
 * Generate the scheduled due-at timestamps for a medication starting at
 * `start` and running for `days`. Uses local hours from `parseSchedule`.
 */
export function generateReminderTimes(
  schedule: string | null | undefined,
  start: Date,
  days: number,
  endDate?: Date | null
): Date[] {
  const parsed = parseSchedule(schedule)
  const out: Date[] = []
  const startMs = start.getTime()
  for (let d = 0; d < days; d++) {
    for (const h of parsed.hours) {
      const date = new Date(start)
      date.setDate(date.getDate() + d)
      date.setHours(h, 0, 0, 0)
      if (date.getTime() < startMs) continue
      if (endDate && date.getTime() > endDate.getTime()) continue
      out.push(date)
    }
  }
  return out
}

export type ReminderBucket = 'today' | 'this_week' | 'later' | 'overdue'

export function bucketFor(dueAt: Date, now: Date = new Date()): ReminderBucket {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(startOfToday)
  endOfToday.setDate(endOfToday.getDate() + 1)
  const endOfWeek = new Date(startOfToday)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  if (dueAt < startOfToday) return 'overdue'
  if (dueAt < endOfToday) return 'today'
  if (dueAt < endOfWeek) return 'this_week'
  return 'later'
}
