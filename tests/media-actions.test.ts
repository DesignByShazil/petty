import { describe, it, expect, vi, beforeEach } from 'vitest'

type Capture = {
  table: string
  op: 'insert' | 'update' | 'delete' | 'select'
  payload?: unknown
  filters: Array<[string, unknown]>
}

const calls: Capture[] = []
let mediaCount = 0

function makeBuilder(table: string, op: Capture['op']) {
  const capture: Capture = { table, op, filters: [] }
  calls.push(capture)

  const builder: Record<string, unknown> = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.head) {
        return {
          eq: () => Promise.resolve({ count: mediaCount, error: null }),
        }
      }
      return builder
    },
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
          capture.op === 'insert' && table === 'media'
            ? { id: 'media-uuid' }
            : null,
        error: null,
      }),
  }
  return builder
}

const storageCalls: Array<{ op: string; args: unknown[] }> = []

const fakeSupabase = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: 'user-uuid' } } }),
  },
  from: (table: string) => makeBuilder(table, 'select'),
  storage: {
    from: (_bucket: string) => ({
      createSignedUploadUrl: (path: string) => {
        storageCalls.push({ op: 'createSignedUploadUrl', args: [path] })
        return Promise.resolve({
          data: { signedUrl: `https://signed/${path}`, token: 'tok', path },
          error: null,
        })
      },
      createSignedUrls: (paths: string[], ttl: number) => {
        storageCalls.push({ op: 'createSignedUrls', args: [paths, ttl] })
        return Promise.resolve({
          data: paths.map((p) => ({ path: p, signedUrl: `https://signed/${p}` })),
          error: null,
        })
      },
      remove: (paths: string[]) => {
        storageCalls.push({ op: 'remove', args: [paths] })
        return Promise.resolve({ data: null, error: null })
      },
    }),
  },
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
  prepareMediaUpload,
  attachMedia,
  removeMedia,
  signedUrlsForPaths,
} from '@/app/pets/[id]/log/[entryId]/media-actions'

beforeEach(() => {
  calls.length = 0
  storageCalls.length = 0
  mediaCount = 0
})

describe('prepareMediaUpload', () => {
  it('returns signed URL + path under pet_id folder for a valid photo', async () => {
    const res = await prepareMediaUpload({
      petId: 'pet-uuid',
      entryId: 'entry-uuid',
      mimeType: 'image/jpeg',
      sizeBytes: 1_000_000,
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.path).toMatch(/^pet-uuid\/.+\.jpg$/)
      expect(res.signedUrl).toMatch(/^https:\/\/signed\//)
    }
    expect(storageCalls[0].op).toBe('createSignedUploadUrl')
  })

  it('rejects files over 100 MB without hitting storage', async () => {
    const res = await prepareMediaUpload({
      petId: 'pet-uuid',
      entryId: 'entry-uuid',
      mimeType: 'video/mp4',
      sizeBytes: 200 * 1024 * 1024,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toMatch(/100 MB/)
    expect(storageCalls.find((c) => c.op === 'createSignedUploadUrl')).toBeUndefined()
  })

  it('rejects unsupported mime types', async () => {
    const res = await prepareMediaUpload({
      petId: 'pet-uuid',
      entryId: 'entry-uuid',
      mimeType: 'application/pdf',
      sizeBytes: 1_000,
    })
    expect(res.ok).toBe(false)
  })

  it('rejects when the entry already has 6 media files', async () => {
    mediaCount = 6
    const res = await prepareMediaUpload({
      petId: 'pet-uuid',
      entryId: 'entry-uuid',
      mimeType: 'image/jpeg',
      sizeBytes: 1_000,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toMatch(/6 files/)
  })
})

describe('attachMedia', () => {
  it('inserts a media row with provided metadata', async () => {
    const res = await attachMedia({
      petId: 'pet-uuid',
      entryId: 'entry-uuid',
      path: 'pet-uuid/abc.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1_000,
      width: 1024,
      height: 768,
      capturedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(res.ok).toBe(true)

    const ins = calls.find((c) => c.table === 'media' && c.op === 'insert')
    expect(ins!.payload).toMatchObject({
      pet_id: 'pet-uuid',
      log_entry_id: 'entry-uuid',
      storage_path: 'pet-uuid/abc.jpg',
      width: 1024,
      height: 768,
      captured_at: '2026-01-01T00:00:00.000Z',
    })
  })
})

describe('removeMedia', () => {
  it('deletes the media row by id', async () => {
    await removeMedia('pet-uuid', 'entry-uuid', 'media-uuid')
    const del = calls.find((c) => c.table === 'media' && c.op === 'delete')
    expect(del!.filters).toContainEqual(['id', 'media-uuid'])
  })
})

describe('signedUrlsForPaths', () => {
  it('returns a path → url map with 10-minute TTL', async () => {
    const out = await signedUrlsForPaths(['a.jpg', 'b.mp4'])
    expect(out).toEqual({
      'a.jpg': 'https://signed/a.jpg',
      'b.mp4': 'https://signed/b.mp4',
    })
    const call = storageCalls.find((c) => c.op === 'createSignedUrls')
    expect(call?.args[1]).toBe(600)
  })

  it('returns empty object for empty input', async () => {
    const out = await signedUrlsForPaths([])
    expect(out).toEqual({})
  })
})
