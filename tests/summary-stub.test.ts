import { describe, it, expect } from 'vitest'
import { StubSummaryProvider } from '@/lib/ai/providers/stub'
import {
  shouldEscalate,
  modelFor,
  HAIKU_MODEL,
  SONNET_MODEL,
  PROMPT_VERSION,
  type SummaryInput,
} from '@/lib/ai/summary'
import type { LogEntry } from '@/lib/db/types'

function baseInput(overrides: Partial<SummaryInput> = {}): SummaryInput {
  return {
    pet: {
      id: 'pet',
      name: 'Pepper',
      species: 'dog',
      breed: 'mix',
      sex: 'female',
      date_of_birth: '2022-01-01',
      weight_kg: 12,
      vet_name: 'Dr. Wong',
      vet_contact: null,
      notes: null,
      updated_at: '2026-04-18T10:00:00.000Z',
    },
    conditions: [],
    medications: [],
    entries: [],
    kind: 'vet_visit',
    rangeStart: '2026-04-04T00:00:00.000Z',
    rangeEnd: '2026-04-18T23:59:59.999Z',
    ...overrides,
  }
}

function entry(overrides: Partial<LogEntry> & { occurred_at: string }): SummaryInput['entries'][number] {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    kind: overrides.kind ?? 'symptom',
    severity: overrides.severity ?? null,
    occurred_at: overrides.occurred_at,
    tags: overrides.tags ?? [],
    body: overrides.body ?? null,
    structured: overrides.structured ?? {},
  }
}

describe('shouldEscalate', () => {
  it('stays on Haiku for small inputs', () => {
    expect(shouldEscalate(baseInput())).toBe(false)
    expect(modelFor(baseInput())).toBe(HAIKU_MODEL)
  })

  it('escalates when entries exceed 100', () => {
    const entries = Array.from({ length: 101 }, (_, i) =>
      entry({ occurred_at: `2026-04-01T${String(i % 24).padStart(2, '0')}:00:00.000Z` })
    )
    expect(shouldEscalate(baseInput({ entries }))).toBe(true)
    expect(modelFor(baseInput({ entries }))).toBe(SONNET_MODEL)
  })

  it('escalates when active conditions exceed 3', () => {
    const conditions = [
      { label: 'a', status: 'active' as const, started_on: null, notes: null },
      { label: 'b', status: 'active' as const, started_on: null, notes: null },
      { label: 'c', status: 'active' as const, started_on: null, notes: null },
      { label: 'd', status: 'active' as const, started_on: null, notes: null },
    ]
    expect(shouldEscalate(baseInput({ conditions }))).toBe(true)
  })

  it('does not escalate when only resolved conditions are numerous', () => {
    const conditions = Array.from({ length: 5 }, () => ({
      label: 'old',
      status: 'resolved' as const,
      started_on: null,
      notes: null,
    }))
    expect(shouldEscalate(baseInput({ conditions }))).toBe(false)
  })
})

describe('StubSummaryProvider', () => {
  it('produces a markdown document citing the entry count and prompt version', async () => {
    const entries = [
      entry({ occurred_at: '2026-04-10T10:00:00.000Z', tags: ['scratching', 'ears'] }),
      entry({ occurred_at: '2026-04-11T10:00:00.000Z', tags: ['scratching'] }),
      entry({ occurred_at: '2026-04-12T10:00:00.000Z', tags: ['scratching'], kind: 'meal' }),
    ]
    const res = await new StubSummaryProvider().generate(baseInput({ entries }))
    expect(res.markdown).toMatch(/# Pepper — Vet visit handoff/)
    expect(res.markdown).toMatch(/scratching.*on 3 day/)
    expect(res.promptVersion).toBe(PROMPT_VERSION)
    expect(res.inputEntryIds).toHaveLength(3)
    expect(res.status).toBe('final')
  })

  it('handles empty entry lists without throwing', async () => {
    const res = await new StubSummaryProvider().generate(baseInput())
    expect(res.markdown).toMatch(/No entries logged/)
    expect(res.inputEntryIds).toEqual([])
  })

  it('marks escalation-worthy inputs with the sonnet stub model', async () => {
    const entries = Array.from({ length: 101 }, (_, i) =>
      entry({ occurred_at: `2026-04-01T${String(i % 24).padStart(2, '0')}:00:00.000Z` })
    )
    const res = await new StubSummaryProvider().generate(baseInput({ entries }))
    expect(res.model).toMatch(/sonnet/)
  })
})
