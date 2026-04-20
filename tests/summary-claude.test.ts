import { describe, it, expect, vi } from 'vitest'
import { ClaudeSummaryProvider } from '@/lib/ai/providers/claude'
import type { SummaryInput } from '@/lib/ai/summary'

function input(overrides: Partial<SummaryInput> = {}): SummaryInput {
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

describe('ClaudeSummaryProvider', () => {
  it('marks the pet-context block with cache_control and caps max_tokens at 1200', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '# Pepper — Vet visit handoff\n\nBody.' }],
        usage: { input_tokens: 800, output_tokens: 300 },
      }),
    } as unknown as Response)

    const p = new ClaudeSummaryProvider('test-key', fetchImpl as unknown as typeof fetch)
    const res = await p.generate(input())

    expect(fetchImpl).toHaveBeenCalledOnce()
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.max_tokens).toBe(1200)
    expect(body.messages[0].content[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(body.messages[0].content[0].text).toMatch(/pet_updated_at:2026-04-18T10:00:00.000Z/)
    expect(res.markdown).toMatch(/Pepper/)
    expect(res.usage.inputTokens).toBe(800)
    expect(res.status).toBe('final')
  })

  it('selects Haiku for small inputs and Sonnet when entries exceed 100', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'OK' }] }),
    } as unknown as Response)

    const p = new ClaudeSummaryProvider('k', fetchImpl as unknown as typeof fetch)

    await p.generate(input())
    const small = JSON.parse(fetchImpl.mock.calls[0][1].body as string)
    expect(small.model).toMatch(/haiku/)

    const entries = Array.from({ length: 101 }, (_, i) => ({
      id: `e${i}`,
      kind: 'symptom' as const,
      severity: null,
      occurred_at: '2026-04-10T10:00:00.000Z',
      tags: [],
      body: null,
      structured: {} as never,
    }))
    await p.generate(input({ entries }))
    const big = JSON.parse(fetchImpl.mock.calls[1][1].body as string)
    expect(big.model).toMatch(/sonnet/)
  })

  it('falls back to the stub with draft status on API error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    } as unknown as Response)

    const p = new ClaudeSummaryProvider('k', fetchImpl as unknown as typeof fetch)
    const res = await p.generate(input())
    expect(res.status).toBe('draft')
    expect(res.markdown).toMatch(/# Pepper/)
  })

  it('surfaces cache hit counters in usage', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Body' }],
        usage: {
          input_tokens: 100,
          output_tokens: 200,
          cache_read_input_tokens: 600,
          cache_creation_input_tokens: 0,
        },
      }),
    } as unknown as Response)

    const p = new ClaudeSummaryProvider('k', fetchImpl as unknown as typeof fetch)
    const res = await p.generate(input())
    expect(res.usage.cacheReadInputTokens).toBe(600)
  })
})
