import { describe, it, expect } from 'vitest'
import {
  MAX_FILE_BYTES,
  MAX_FILES_PER_ENTRY,
  validateMediaFile,
  validateBatchCount,
  describeError,
  extensionFor,
  isAllowedMime,
} from '@/lib/media/validate'

describe('validateMediaFile', () => {
  it('accepts a normal photo', () => {
    const res = validateMediaFile({ name: 'paw.jpg', size: 2_000_000, type: 'image/jpeg' })
    expect(res.ok).toBe(true)
  })

  it('accepts a video under the limit', () => {
    const res = validateMediaFile({ name: 'clip.mp4', size: 50_000_000, type: 'video/mp4' })
    expect(res.ok).toBe(true)
  })

  it('rejects files over 100 MB as too-large', () => {
    const res = validateMediaFile({
      name: 'huge.mp4',
      size: MAX_FILE_BYTES + 1,
      type: 'video/mp4',
    })
    expect(res).toEqual({ ok: false, reason: 'too-large', name: 'huge.mp4' })
    if (!res.ok) expect(describeError(res)).toMatch(/100 MB/)
  })

  it('rejects unsupported mime types', () => {
    const res = validateMediaFile({ name: 'doc.pdf', size: 1_000, type: 'application/pdf' })
    expect(res).toEqual({ ok: false, reason: 'bad-type', name: 'doc.pdf' })
  })
})

describe('validateBatchCount', () => {
  it('allows up to the per-entry cap', () => {
    expect(validateBatchCount(0, MAX_FILES_PER_ENTRY).ok).toBe(true)
    expect(validateBatchCount(2, 4).ok).toBe(true)
  })

  it('rejects when count exceeds cap', () => {
    const res = validateBatchCount(5, 2)
    expect(res).toEqual({ ok: false, reason: 'too-many' })
  })
})

describe('extensionFor', () => {
  it('maps known mime types', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg')
    expect(extensionFor('video/quicktime')).toBe('mov')
  })

  it('falls back to bin for unknown types', () => {
    expect(extensionFor('application/x-unknown')).toBe('bin')
  })
})

describe('isAllowedMime', () => {
  it('narrows to the allowed list', () => {
    expect(isAllowedMime('image/jpeg')).toBe(true)
    expect(isAllowedMime('application/pdf')).toBe(false)
  })
})
