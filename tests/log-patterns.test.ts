import { describe, it, expect } from 'vitest'
import {
  groupByDay,
  topTags,
  patternHighlights,
  parseFilters,
  buildQuery,
} from '@/lib/log/patterns'
import type { LogEntry } from '@/lib/db/types'

function entry(partial: Partial<LogEntry> & { occurred_at: string }): LogEntry {
  return {
    id: partial.id ?? crypto.randomUUID(),
    pet_id: 'pet',
    author_id: 'user',
    kind: partial.kind ?? 'symptom',
    severity: partial.severity ?? null,
    occurred_at: partial.occurred_at,
    tags: partial.tags ?? [],
    body: partial.body ?? null,
    structured: partial.structured ?? {},
    created_at: partial.created_at ?? partial.occurred_at,
    updated_at: partial.updated_at ?? partial.occurred_at,
    deleted_at: null,
  }
}

describe('groupByDay', () => {
  it('groups by local calendar day and preserves order', () => {
    const list = [
      entry({ id: 'a', occurred_at: '2026-04-18T20:00:00' }),
      entry({ id: 'b', occurred_at: '2026-04-18T09:00:00' }),
      entry({ id: 'c', occurred_at: '2026-04-17T18:00:00' }),
    ]
    const groups = groupByDay(list)
    expect(groups).toHaveLength(2)
    expect(groups[0].entries.map((e) => e.id)).toEqual(['a', 'b'])
    expect(groups[1].entries.map((e) => e.id)).toEqual(['c'])
  })

  it('returns an empty list for no entries', () => {
    expect(groupByDay([])).toEqual([])
  })
})

describe('topTags', () => {
  it('counts and orders tags by frequency', () => {
    const list = [
      entry({ occurred_at: '2026-04-18T10:00:00', tags: ['scratching', 'ears'] }),
      entry({ occurred_at: '2026-04-18T11:00:00', tags: ['scratching'] }),
      entry({ occurred_at: '2026-04-17T10:00:00', tags: ['vomit'] }),
    ]
    const tags = topTags(list)
    expect(tags[0]).toEqual({ tag: 'scratching', count: 2 })
    expect(tags.map((t) => t.tag)).toContain('ears')
    expect(tags.map((t) => t.tag)).toContain('vomit')
  })
})

describe('patternHighlights', () => {
  it('flags a tag that appears on most of the last 7 days', () => {
    const now = new Date('2026-04-18T12:00:00')
    const list: LogEntry[] = []
    // 6 of the last 7 days include "scratching"
    for (let i = 0; i < 6; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      list.push(entry({ occurred_at: d.toISOString(), tags: ['scratching'] }))
    }
    const hits = patternHighlights(list, { now })
    expect(hits).toHaveLength(1)
    expect(hits[0].tag).toBe('scratching')
    expect(hits[0].days).toBe(6)
    expect(hits[0].message).toMatch(/scratching logged on 6 of the last 7 days/)
  })

  it('does not flag sparse tags', () => {
    const now = new Date('2026-04-18T12:00:00')
    const list = [
      entry({ occurred_at: '2026-04-18T12:00:00', tags: ['vomit'] }),
      entry({ occurred_at: '2026-04-15T12:00:00', tags: ['vomit'] }),
    ]
    const hits = patternHighlights(list, { now })
    expect(hits).toEqual([])
  })

  it('counts each day once even if the tag appears multiple times that day', () => {
    const now = new Date('2026-04-18T22:00:00')
    const list: LogEntry[] = []
    for (let i = 0; i < 5; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(9)
      list.push(entry({ occurred_at: d.toISOString(), tags: ['itchy'] }))
      d.setHours(20)
      list.push(entry({ occurred_at: d.toISOString(), tags: ['itchy'] }))
    }
    const hits = patternHighlights(list, { now })
    expect(hits[0].days).toBe(5)
  })
})

describe('parseFilters', () => {
  it('accepts valid log kinds and drops unknown values', () => {
    expect(parseFilters({ kind: 'symptom' }).kind).toBe('symptom')
    expect(parseFilters({ kind: 'banana' }).kind).toBeUndefined()
  })

  it('normalises tags to lowercase', () => {
    expect(parseFilters({ tag: 'Scratching' }).tag).toBe('scratching')
  })

  it('keeps date strings as-is', () => {
    expect(parseFilters({ from: '2026-04-01', to: '2026-04-18' })).toMatchObject({
      from: '2026-04-01',
      to: '2026-04-18',
    })
  })
})

describe('buildQuery', () => {
  it('returns an empty string when no filters or page', () => {
    expect(buildQuery({})).toBe('')
  })

  it('includes filters and page', () => {
    const q = buildQuery({ kind: 'symptom', tag: 'scratching' }, 2)
    expect(q).toMatch(/^\?/)
    expect(q).toMatch(/kind=symptom/)
    expect(q).toMatch(/tag=scratching/)
    expect(q).toMatch(/page=2/)
  })
})
