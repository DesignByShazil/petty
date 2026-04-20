import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture what server actions send to Supabase so we can verify the payload.
type Capture = {
  table: string
  op: 'insert' | 'update' | 'delete' | 'select'
  payload?: unknown
  filters: Array<[string, unknown]>
}

const calls: Capture[] = []
let selectResult: unknown = null

function makeBuilder(table: string, op: Capture['op'], payload?: unknown) {
  const capture: Capture = { table, op, payload, filters: [] }
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
          capture.op === 'insert' && table === 'pet'
            ? { id: 'pet-uuid' }
            : capture.op === 'insert' && table === 'medication'
              ? { id: 'med-uuid', active: true, end_date: null }
              : capture.op === 'update' && table === 'medication'
                ? { name: 'Apoquel', schedule: null, start_date: null, end_date: null }
                : capture.op === 'select' && table === 'household'
                  ? { id: 'household-uuid' }
                  : null,
        error: null,
      }),
    then: (resolve: (v: { data: unknown; error: null }) => unknown) =>
      resolve({ data: selectResult, error: null }),
  }
  return builder
}

const fakeSupabase = {
  auth: {
    getUser: () =>
      Promise.resolve({ data: { user: { id: 'user-uuid' } } }),
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
  createPet,
  addCondition,
  addMedication,
  updatePet,
  removeCondition,
} from '@/app/pets/actions'

beforeEach(() => {
  calls.length = 0
  selectResult = null
})

describe('pet server actions', () => {
  it('createPet inserts pet with household and redirects to overview', async () => {
    const fd = new FormData()
    fd.set('name', 'Buddy')
    fd.set('species', 'dog')
    fd.set('breed', 'Labrador')
    fd.set('sex', 'male')
    fd.set('weight_kg', '12.5')

    await expect(createPet(fd)).rejects.toThrow(/REDIRECT:\/pets\/pet-uuid/)

    const insert = calls.find((c) => c.table === 'pet' && c.op === 'insert')
    expect(insert).toBeDefined()
    expect(insert!.payload).toMatchObject({
      household_id: 'household-uuid',
      name: 'Buddy',
      species: 'dog',
      breed: 'Labrador',
      sex: 'male',
      weight_kg: 12.5,
    })
  })

  it('updatePet sends the edited fields to the right pet row', async () => {
    const fd = new FormData()
    fd.set('name', 'Buddy II')
    fd.set('species', 'dog')
    fd.set('sex', 'male')
    fd.set('weight_kg', '')

    await updatePet('pet-uuid', fd)

    const upd = calls.find((c) => c.table === 'pet' && c.op === 'update')
    expect(upd).toBeDefined()
    expect(upd!.payload).toMatchObject({ name: 'Buddy II', weight_kg: null })
    expect(upd!.filters).toContainEqual(['id', 'pet-uuid'])
  })

  it('addCondition inserts a condition linked to the pet', async () => {
    const fd = new FormData()
    fd.set('label', 'atopic dermatitis')
    fd.set('status', 'active')
    fd.set('started_on', '2026-03-01')

    await addCondition('pet-uuid', fd)

    const ins = calls.find((c) => c.table === 'condition' && c.op === 'insert')
    expect(ins!.payload).toMatchObject({
      pet_id: 'pet-uuid',
      label: 'atopic dermatitis',
      status: 'active',
      started_on: '2026-03-01',
    })
  })

  it('removeCondition deletes the right row', async () => {
    await removeCondition('pet-uuid', 'cond-uuid')
    const del = calls.find((c) => c.table === 'condition' && c.op === 'delete')
    expect(del!.filters).toContainEqual(['id', 'cond-uuid'])
  })

  it('addMedication inserts a medication with optional fields', async () => {
    const fd = new FormData()
    fd.set('name', 'Apoquel')
    fd.set('dose_amount', '5.4 mg')
    fd.set('schedule', 'twice daily')

    await addMedication('pet-uuid', fd)

    const ins = calls.find((c) => c.table === 'medication' && c.op === 'insert')
    expect(ins!.payload).toMatchObject({
      pet_id: 'pet-uuid',
      name: 'Apoquel',
      dose_amount: '5.4 mg',
      schedule: 'twice daily',
    })
  })
})
