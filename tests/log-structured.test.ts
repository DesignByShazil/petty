import { describe, it, expect } from 'vitest'
import { buildStructured, parseTags } from '@/lib/log/structured'

describe('buildStructured', () => {
  it('extracts symptom fields', () => {
    const fd = new FormData()
    fd.set('area', 'ears')
    fd.set('duration_minutes', '20')

    expect(buildStructured('symptom', fd)).toEqual({
      area: 'ears',
      duration_minutes: 20,
    })
  })

  it('extracts meal fields and finished flag', () => {
    const fd = new FormData()
    fd.set('food', "Hill's z/d")
    fd.set('amount_g', '150')
    fd.set('finished', 'on')

    expect(buildStructured('meal', fd)).toEqual({
      food: "Hill's z/d",
      amount_g: 150,
      finished: true,
    })
  })

  it('omits undefined/empty fields', () => {
    const fd = new FormData()
    fd.set('food', '')
    expect(buildStructured('meal', fd)).toEqual({})
  })

  it('returns empty object for note kind', () => {
    expect(buildStructured('note', new FormData())).toEqual({})
  })
})

describe('parseTags', () => {
  it('splits on spaces and commas, lowercases, dedupes', () => {
    expect(parseTags('Scratching, ears  hind-leg Ears')).toEqual([
      'scratching',
      'ears',
      'hind-leg',
    ])
  })

  it('returns [] for empty input', () => {
    expect(parseTags('   ')).toEqual([])
  })
})
