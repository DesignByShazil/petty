export const MAX_FILE_BYTES = 100 * 1024 * 1024 // 100 MB
export const MAX_FILES_PER_ENTRY = 6

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const

export type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number]

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime)
}

export type ValidationError =
  | { ok: false; reason: 'too-large'; name: string }
  | { ok: false; reason: 'bad-type'; name: string }
  | { ok: false; reason: 'too-many' }

/**
 * Validate a file against the size/type rules. Does NOT check count — see
 * validateBatchCount for that.
 */
export function validateMediaFile(
  file: { name: string; size: number; type: string }
): { ok: true } | ValidationError {
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: 'too-large', name: file.name }
  if (!isAllowedMime(file.type)) return { ok: false, reason: 'bad-type', name: file.name }
  return { ok: true }
}

export function validateBatchCount(
  existing: number,
  incoming: number
): { ok: true } | ValidationError {
  if (existing + incoming > MAX_FILES_PER_ENTRY) return { ok: false, reason: 'too-many' }
  return { ok: true }
}

export function describeError(err: ValidationError): string {
  switch (err.reason) {
    case 'too-large':
      return `${err.name} is over 100 MB.`
    case 'bad-type':
      return `${err.name} isn't a supported photo or video type.`
    case 'too-many':
      return `You can attach up to ${MAX_FILES_PER_ENTRY} files per entry.`
  }
}

export function extensionFor(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  }
  return map[mime] ?? 'bin'
}
