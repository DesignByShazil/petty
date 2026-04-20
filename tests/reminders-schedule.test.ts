import { describe, it, expect } from 'vitest'
import { parseSchedule, generateReminderTimes, bucketFor } from '@/lib/reminders/schedule'
import { remindersForMedication } from '@/lib/reminders/generate'

describe('parseSchedule', () => {
  it('maps "twice daily" to 2 doses', () => {
    expect(parseSchedule('twice daily').dosesPerDay).toBe(2)
  })

  it('maps "every 8 hours" to 3 doses', () => {
    expect(parseSchedule('every 8 hours').dosesPerDay).toBe(3)
  })

  it('maps "3x daily" to 3 doses', () => {
    expect(parseSchedule('3x daily').dosesPerDay).toBe(3)
  })

  it('maps "bid" shorthand to 2', () => {
    expect(parseSchedule('bid').dosesPerDay).toBe(2)
  })

  it('falls back to once-daily for empty or unknown', () => {
    expect(parseSchedule('').dosesPerDay).toBe(1)
    expect(parseSchedule('whenever the cat allows').dosesPerDay).toBe(1)
  })

  it('caps at six doses per day', () => {
    expect(parseSchedule('12x daily').dosesPerDay).toBeLessThanOrEqual(6)
  })
})

describe('generateReminderTimes', () => {
  it('produces dosesPerDay x days entries', () => {
    const start = new Date('2026-04-20T06:00:00')
    const times = generateReminderTimes('twice daily', start, 7)
    expect(times.length).toBe(14)
  })

  it('does not schedule reminders past endDate', () => {
    const start = new Date('2026-04-20T06:00:00')
    const end = new Date('2026-04-22T00:00:00')
    const times = generateReminderTimes('twice daily', start, 7, end)
    for (const t of times) expect(t.getTime()).toBeLessThanOrEqual(end.getTime())
  })

  it('skips past times when start is before now', () => {
    const start = new Date('2026-04-20T00:00:01')
    const times = generateReminderTimes('twice daily', start, 1)
    // "twice daily" defaults to 09:00 + 21:00; both are after start at 00:00:01
    expect(times.length).toBe(2)
  })
})

describe('remindersForMedication', () => {
  it('builds 14 medication reminders for a twice-daily med over 7 days', () => {
    // Use an explicit local start at 00:00 to avoid timezone-dependent parsing.
    const now = new Date(2026, 3, 20, 0, 0, 0)
    const rows = remindersForMedication({
      petId: 'pet',
      medicationId: 'med',
      medicationName: 'Apoquel',
      schedule: 'twice daily',
      startDate: null,
      now,
    })
    expect(rows).toHaveLength(14)
    expect(rows[0]).toMatchObject({
      pet_id: 'pet',
      medication_id: 'med',
      kind: 'medication',
      title: 'Apoquel',
    })
  })

  it('returns an empty list when schedule parses to zero reminders in window', () => {
    const rows = remindersForMedication({
      petId: 'pet',
      medicationId: 'med',
      medicationName: 'Apoquel',
      schedule: 'daily',
      startDate: '2026-05-01',
      endDate: '2026-04-20',
      now: new Date('2026-04-20T06:00:00'),
    })
    expect(rows).toEqual([])
  })
})

describe('bucketFor', () => {
  const now = new Date('2026-04-20T12:00:00')

  it('flags past dates as overdue', () => {
    expect(bucketFor(new Date('2026-04-19T12:00:00'), now)).toBe('overdue')
  })

  it('flags today', () => {
    expect(bucketFor(new Date('2026-04-20T18:00:00'), now)).toBe('today')
  })

  it('flags this week', () => {
    expect(bucketFor(new Date('2026-04-24T12:00:00'), now)).toBe('this_week')
  })

  it('flags later', () => {
    expect(bucketFor(new Date('2026-05-01T12:00:00'), now)).toBe('later')
  })
})
