'use server'

import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'
import {
  MAX_FILE_BYTES,
  MAX_FILES_PER_ENTRY,
  extensionFor,
  isAllowedMime,
} from '@/lib/media/validate'

const BUCKET = 'pet-media'
const SIGNED_URL_TTL_SECONDS = 600 // 10 minutes

type PrepareArgs = {
  petId: string
  entryId: string
  mimeType: string
  sizeBytes: number
}

type PrepareResult =
  | { ok: true; signedUrl: string; token: string; path: string }
  | { ok: false; reason: string }

/**
 * Server action: validates + mints a signed upload URL for the client.
 * Path format: `{pet_id}/{random}.{ext}` so the storage RLS policy can
 * check membership via the first folder segment.
 */
export async function prepareMediaUpload({
  petId,
  entryId,
  mimeType,
  sizeBytes,
}: PrepareArgs): Promise<PrepareResult> {
  if (!isAllowedMime(mimeType)) {
    return { ok: false, reason: 'Unsupported file type.' }
  }
  if (sizeBytes > MAX_FILE_BYTES) {
    return { ok: false, reason: 'File is over 100 MB.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'Not authenticated.' }

  // Enforce per-entry cap on the server
  const { count, error: countErr } = await supabase
    .from('media')
    .select('id', { count: 'exact', head: true })
    .eq('log_entry_id', entryId)
  if (countErr) return { ok: false, reason: 'Something went wrong. Try again.' }
  if ((count ?? 0) >= MAX_FILES_PER_ENTRY) {
    return { ok: false, reason: `You can attach up to ${MAX_FILES_PER_ENTRY} files per entry.` }
  }

  const ext = extensionFor(mimeType)
  const path = `${petId}/${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) return { ok: false, reason: 'Could not start the upload.' }

  return { ok: true, signedUrl: data.signedUrl, token: data.token, path }
}

type AttachArgs = {
  petId: string
  entryId: string
  path: string
  mimeType: string
  sizeBytes: number
  width?: number | null
  height?: number | null
  durationSeconds?: number | null
  capturedAt?: string | null
}

type AttachResult =
  | { ok: true; mediaId: string }
  | { ok: false; reason: string }

/**
 * Server action: after the client PUTs to the signed URL, call this to
 * insert the media row. RLS ensures the user can only attach to their
 * own household's pets/entries.
 */
export async function attachMedia(args: AttachArgs): Promise<AttachResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('media')
    .insert({
      log_entry_id: args.entryId,
      pet_id: args.petId,
      storage_path: args.path,
      mime_type: args.mimeType,
      size_bytes: args.sizeBytes,
      width: args.width ?? null,
      height: args.height ?? null,
      duration_seconds: args.durationSeconds ?? null,
      captured_at: args.capturedAt ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    // Best-effort cleanup of the orphaned storage object
    await supabase.storage.from(BUCKET).remove([args.path])
    return { ok: false, reason: 'Could not save the media.' }
  }

  revalidatePath(`/pets/${args.petId}`)
  revalidatePath(`/pets/${args.petId}/log/${args.entryId}`)
  return { ok: true, mediaId: data.id }
}

/**
 * Server action: delete the media row. A DB trigger removes the
 * corresponding storage object in the same transaction.
 */
export async function removeMedia(
  petId: string,
  entryId: string,
  mediaId: string
) {
  const supabase = await createClient()
  const { error } = await supabase.from('media').delete().eq('id', mediaId)
  if (error) throw error
  revalidatePath(`/pets/${petId}`)
  revalidatePath(`/pets/${petId}/log/${entryId}`)
}

/**
 * Server helper: mint short-lived signed URLs for a list of storage paths.
 * Used to render thumbnails in the timeline.
 */
export async function signedUrlsForPaths(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return {}

  const out: Record<string, string> = {}
  for (const item of data) {
    if (item.signedUrl && item.path) out[item.path] = item.signedUrl
  }
  return out
}
