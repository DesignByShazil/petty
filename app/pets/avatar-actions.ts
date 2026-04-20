'use server'

import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'

const BUCKET = 'pet-media'
const MAX_AVATAR_BYTES = 8 * 1024 * 1024 // 8 MB
const AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const
const SIGNED_URL_TTL_SECONDS = 600

const EXT_FOR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

type PrepareResult =
  | { ok: true; signedUrl: string; token: string; path: string }
  | { ok: false; reason: string }

/**
 * Server action: mint a signed upload URL for a pet avatar.
 * Path format: `{pet_id}/avatar-{random}.{ext}` so storage RLS can
 * validate household membership via the first folder segment.
 */
export async function prepareAvatarUpload(
  petId: string,
  mimeType: string,
  sizeBytes: number
): Promise<PrepareResult> {
  if (!(AVATAR_MIME as readonly string[]).includes(mimeType)) {
    return { ok: false, reason: 'Use a JPG, PNG, WebP, or HEIC image.' }
  }
  if (sizeBytes > MAX_AVATAR_BYTES) {
    return { ok: false, reason: 'Photo must be under 8 MB.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'Not authenticated.' }

  // RLS on pet already scopes this to the user's household.
  const { data: pet, error: petErr } = await supabase
    .from('pet')
    .select('id')
    .eq('id', petId)
    .is('deleted_at', null)
    .maybeSingle()
  if (petErr || !pet) return { ok: false, reason: 'Pet not found.' }

  const ext = EXT_FOR_MIME[mimeType] ?? 'bin'
  const path = `${petId}/avatar-${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) return { ok: false, reason: 'Could not start the upload.' }

  return { ok: true, signedUrl: data.signedUrl, token: data.token, path }
}

type CommitResult = { ok: true } | { ok: false; reason: string }

/**
 * Server action: set `pet.avatar_url` to the storage path of a freshly
 * uploaded avatar, and remove the previous avatar object if any.
 */
export async function commitAvatar(petId: string, path: string): Promise<CommitResult> {
  if (!path.startsWith(`${petId}/`)) {
    return { ok: false, reason: 'Invalid path.' }
  }

  const supabase = await createClient()

  const { data: prev } = await supabase
    .from('pet')
    .select('avatar_url')
    .eq('id', petId)
    .maybeSingle()

  const { error } = await supabase
    .from('pet')
    .update({ avatar_url: path })
    .eq('id', petId)

  if (error) return { ok: false, reason: 'Could not save the photo.' }

  // Best-effort cleanup of the previous avatar object.
  if (prev?.avatar_url && prev.avatar_url !== path) {
    await supabase.storage.from(BUCKET).remove([prev.avatar_url])
  }

  revalidatePath('/pets')
  revalidatePath(`/pets/${petId}`)
  return { ok: true }
}

export async function removeAvatar(petId: string): Promise<CommitResult> {
  const supabase = await createClient()

  const { data: prev } = await supabase
    .from('pet')
    .select('avatar_url')
    .eq('id', petId)
    .maybeSingle()

  const { error } = await supabase
    .from('pet')
    .update({ avatar_url: null })
    .eq('id', petId)

  if (error) return { ok: false, reason: 'Could not remove the photo.' }

  if (prev?.avatar_url) {
    await supabase.storage.from(BUCKET).remove([prev.avatar_url])
  }

  revalidatePath('/pets')
  revalidatePath(`/pets/${petId}`)
  return { ok: true }
}

/**
 * Server helper: mint short-lived signed GET URLs for a list of avatar paths.
 */
export async function signedAvatarUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)))
  if (unique.length === 0) return {}
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return {}

  const out: Record<string, string> = {}
  for (const item of data) {
    if (item.signedUrl && item.path) out[item.path] = item.signedUrl
  }
  return out
}
