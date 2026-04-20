import { describe, it, expect, vi, beforeEach } from 'vitest'

type Capture = {
  table: string
  op: 'insert' | 'update' | 'delete' | 'select'
  payload?: unknown
  filters: Array<[string, unknown]>
}

const calls: Capture[] = []
let reminderRow: Record<string, unknown> | null = null

function makeBuilder(table: string, op: Capture['op']) {
  const capture: Capture = { table, op, filters: [] }
  calls.push(capture)

  const builder: Record<string, unknown> = {
    select: () => builder,
    insert: (p: unknown) => {
      capture.op = 'insert'
      capture.payload = p
      return builder
    },
    update: (p: unknown) => {
      capture.op = 'update'
      capture.payload = p
      return builder
    },
    delete: () => {
      capture.op = 'delete'
      return builder
    },
    eq: (col: string, val: unknown) => {
      capture.filters.push([col, val])
      return builder
    },
    single: () =>
      Promise.resolve({
        data:
          capture.op === 'select' && table === 'reminder'
            ? reminderRow
            : null,
        error: null,
      }),
    then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
      resolve({ data: null, error: null }),
  }
  return builder
}

const fakeSupabase = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: 'user-uuid' } } }),
  },
  from: (table: string) => makeBuilder(table, 'select'),
}

vi.mock('@/lib/db/server', () => ({ createClient: async () => fakeSupabase }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { resolveReminder, deleteReminder } from '@/app/reminders/actions'

beforeEach(() => {
  calls.length = 0
  reminderRow = {
    id: 'rem-uuid',
    pet_id: 'pet-uuid',
    medication_id: 'med-uuid',
    kind: 'medication',
  }
})

describe('resolveReminder', () => {
  it('marks the reminder done and logs a given dose', async () => {
    await resolveReminder('rem-uuid', 'given')
    const updated = calls.find((c) => c.table === 'reminder' && c.op === 'update')
    expect(updated!.payload).toMatchObject({ status: 'done' })
    const dose = calls.find((c) => c.table === 'medication_dose' && c.op === 'insert')
    expect(dose!.payload).toMatchObject({
      medication_id: 'med-uuid',
      pet_id: 'pet-uuid',
      reminder_id: 'rem-uuid',
      given_by: 'user-uuid',
      outcome: 'given',
    })
  })

  it('marks the reminder skipped on missed and still logs a dose row', async () => {
    await resolveReminder('rem-uuid', 'missed')
    const updated = calls.find((c) => c.table === 'reminder' && c.op === 'update')
    expect(updated!.payload).toMatchObject({ status: 'skipped' })
    const dose = calls.find((c) => c.table === 'medication_dose' && c.op === 'insert')
    expect(dose!.payload).toMatchObject({ outcome: 'missed' })
  })

  it('does not create a dose row for a non-medication reminder', async () => {
    reminderRow = {
      id: 'rem-uuid',
      pet_id: 'pet-uuid',
      medication_id: null,
      kind: 'vet_followup',
    }
    await resolveReminder('rem-uuid', 'given')
    expect(calls.find((c) => c.table === 'medication_dose')).toBeUndefined()
  })
})

describe('deleteReminder', () => {
  it('deletes the reminder row by id', async () => {
    await deleteReminder('rem-uuid')
    const del = calls.find((c) => c.table === 'reminder' && c.op === 'delete')
    expect(del!.filters).toContainEqual(['id', 'rem-uuid'])
  })
})
