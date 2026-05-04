import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createInvite, revokeInvite, removeMember } from '@/app/settings/household/actions'

// ── Shared mock builder ──────────────────────────────────────────────────────

type Call = { table: string; op: string; payload?: unknown; filters: Record<string, unknown> }
const calls: Call[] = []

function makeBuilder(table: string, returnValue: unknown, op = 'select') {
  const ctx: Record<string, unknown> = { table, op, payload: undefined, filters: {} }
  const b: Record<string, unknown> = {}

  const methods = ['select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'is', 'gte', 'lte', 'maybeSingle', 'single', 'limit', 'order']

  methods.forEach((m) => {
    b[m] = (...args: unknown[]) => {
      if (m === 'insert' || m === 'update' || m === 'upsert') ctx.payload = args[0]
      if (m === 'eq' || m === 'is' || m === 'gte') (ctx.filters as Record<string, unknown>)[args[0] as string] = args[1]
      if (m === 'select') ctx.op = 'select'
      if (m === 'insert') ctx.op = 'insert'
      if (m === 'update') ctx.op = 'update'
      if (m === 'delete') ctx.op = 'delete'
      if (m === 'single' || m === 'maybeSingle') {
        calls.push({ table: ctx.table as string, op: ctx.op as string, payload: ctx.payload, filters: ctx.filters as Record<string, unknown> })
        return Promise.resolve(returnValue)
      }
      return b
    }
  })

  return b
}

const mockClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}

vi.mock('@/lib/db/server', () => ({
  createClient: () => Promise.resolve(mockClient),
}))

vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// ── Tests ────────────────────────────────────────────────────────────────────

describe('createInvite', () => {
  beforeEach(() => {
    calls.length = 0
    mockClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'owner-uid' } } })
  })

  it('returns error when email is missing', async () => {
    const fd = new FormData()
    fd.set('email', '  ')
    const result = await createInvite(null, fd)
    expect(result?.error).toMatch(/required/i)
  })

  it('returns error when user is not a household owner', async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'household') return makeBuilder(table, { data: null, error: null }, 'select')
      return makeBuilder(table, { data: null, error: null })
    })
    const fd = new FormData()
    fd.set('email', 'friend@example.com')
    const result = await createInvite(null, fd)
    expect(result?.error).toMatch(/owner/i)
  })

  it('returns error when a pending invite already exists', async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'household')
        return makeBuilder(table, { data: { id: 'hh-1' }, error: null })
      if (table === 'invite')
        return makeBuilder(table, { data: { id: 'existing-invite' }, error: null })
      return makeBuilder(table, { data: null, error: null })
    })
    const fd = new FormData()
    fd.set('email', 'friend@example.com')
    const result = await createInvite(null, fd)
    expect(result?.error).toMatch(/already exists/i)
  })

  it('creates invite and returns acceptUrl on success', async () => {
    let inviteCallCount = 0
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'household')
        return makeBuilder(table, { data: { id: 'hh-1' }, error: null })
      if (table === 'invite') {
        inviteCallCount++
        // First call: check existing (returns null), second call: insert (returns token)
        if (inviteCallCount === 1)
          return makeBuilder(table, { data: null, error: null })
        return makeBuilder(table, { data: { token: 'abc123' }, error: null }, 'insert')
      }
      return makeBuilder(table, { data: null, error: null })
    })
    const fd = new FormData()
    fd.set('email', 'friend@example.com')
    const result = await createInvite(null, fd)
    expect(result?.ok).toBe(true)
    expect(result?.acceptUrl).toContain('/invite/abc123')
    expect(result?.email).toBe('friend@example.com')
  })
})

describe('revokeInvite', () => {
  it('deletes the invite row', async () => {
    calls.length = 0
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    mockClient.from.mockReturnValue({ delete: deleteMock })
    await revokeInvite('invite-id')
    expect(deleteMock).toHaveBeenCalled()
  })
})

describe('removeMember', () => {
  beforeEach(() => {
    calls.length = 0
    mockClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'owner-uid' } } })
  })

  it('redirects when unauthenticated', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null } })
    await expect(removeMember('m-1')).rejects.toThrow(/REDIRECT:\/sign-in/)
  })

  it('does nothing when member not found', async () => {
    mockClient.from.mockImplementation(() =>
      makeBuilder('household_member', { data: null, error: null })
    )
    // Should not throw
    await removeMember('m-missing')
  })

  it('does not remove the current user (self)', async () => {
    const deleteMock = vi.fn()
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'household_member') {
        return makeBuilder(table, {
          data: { id: 'm-1', user_id: 'owner-uid', household_id: 'hh-1', role: 'owner' },
          error: null,
        })
      }
      return { delete: deleteMock }
    })
    await removeMember('m-1')
    expect(deleteMock).not.toHaveBeenCalled()
  })
})
