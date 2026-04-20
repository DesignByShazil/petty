import { describe, it, expect, vi, beforeEach } from 'vitest'

type Capture = {
  table: string
  op: 'insert' | 'update' | 'delete' | 'select'
  payload?: unknown
  filters: Array<[string, unknown]>
}

const calls: Capture[] = []

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
    is: (col: string, val: unknown) => {
      capture.filters.push([col, val])
      return builder
    },
    order: () => builder,
    limit: () => builder,
    single: () =>
      Promise.resolve({
        data:
          capture.op === 'insert' && table === 'log_entry'
            ? { id: 'entry-uuid' }
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

vi.mock('@/lib/db/server', () => ({
  createClient: async () => fakeSupabase,
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))

import {
  createLogEntry,
  updateLogEntry,
  deleteLogEntry,
} from '@/app/pets/[id]/log/actions'

beforeEach(() => {
  calls.length = 0
})

describe('log entry server actions', () => {
  it('logs a symptom with severity, tags, and structured area', async () => {
    const fd = new FormData()
    fd.set('kind', 'symptom')
    fd.set('severity', '3')
    fd.set('tags', 'scratching, ears')
    fd.set('body', 'Scratching for 10 minutes')
    fd.set('area', 'ears')
    fd.set('duration_minutes', '10')

    await expect(createLogEntry('pet-uuid', fd)).rejects.toThrow(
      /REDIRECT:\/pets\/pet-uuid\/log\/entry-uuid/
    )

    const ins = calls.find((c) => c.table === 'log_entry' && c.op === 'insert')
    expect(ins).toBeDefined()
    expect(ins!.payload).toMatchObject({
      pet_id: 'pet-uuid',
      author_id: 'user-uuid',
      kind: 'symptom',
      severity: 3,
      tags: ['scratching', 'ears'],
      body: 'Scratching for 10 minutes',
      structured: { area: 'ears', duration_minutes: 10 },
    })
  })

  it('logs a meal with amount and finished flag', async () => {
    const fd = new FormData()
    fd.set('kind', 'meal')
    fd.set('food', "Hill's z/d")
    fd.set('amount_g', '150')
    fd.set('finished', 'on')

    await expect(createLogEntry('pet-uuid', fd)).rejects.toThrow(/REDIRECT/)

    const ins = calls.find((c) => c.table === 'log_entry' && c.op === 'insert')
    expect(ins!.payload).toMatchObject({
      kind: 'meal',
      structured: { food: "Hill's z/d", amount_g: 150, finished: true },
    })
  })

  it('updateLogEntry edits severity on the matching row', async () => {
    const fd = new FormData()
    fd.set('kind', 'symptom')
    fd.set('severity', '5')

    await expect(
      updateLogEntry('pet-uuid', 'entry-uuid', fd)
    ).rejects.toThrow(/REDIRECT/)

    const upd = calls.find((c) => c.table === 'log_entry' && c.op === 'update')
    expect(upd!.payload).toMatchObject({ severity: 5, kind: 'symptom' })
    expect(upd!.filters).toContainEqual(['id', 'entry-uuid'])
  })

  it('deleteLogEntry soft-deletes (sets deleted_at)', async () => {
    await deleteLogEntry('pet-uuid', 'entry-uuid')

    const upd = calls.find((c) => c.table === 'log_entry' && c.op === 'update')
    expect(upd).toBeDefined()
    const payload = upd!.payload as { deleted_at?: string }
    expect(payload.deleted_at).toBeTypeOf('string')
    expect(upd!.filters).toContainEqual(['id', 'entry-uuid'])
  })
})
