'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import type { LogKind } from '@/lib/db/types'
import { buildStructured, parseTags } from '@/lib/log/structured'

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}

export async function createLogEntry(petId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const kind = String(formData.get('kind') ?? 'note') as LogKind

  const severityRaw = emptyToNull(formData.get('severity'))
  const severity = severityRaw ? Number(severityRaw) : null

  const occurredRaw = emptyToNull(formData.get('occurred_at'))
  // <input type="datetime-local"> is local time without tz — let the browser's value
  // be converted via new Date() which interprets it as local, then stored as UTC.
  const occurred_at = occurredRaw ? new Date(occurredRaw).toISOString() : new Date().toISOString()

  const tags = parseTags(String(formData.get('tags') ?? ''))

  const { data: entry, error } = await supabase
    .from('log_entry')
    .insert({
      pet_id: petId,
      author_id: user.id,
      kind,
      severity,
      occurred_at,
      tags,
      body: emptyToNull(formData.get('body')),
      structured: buildStructured(kind, formData),
    })
    .select('id')
    .single()

  if (error || !entry) throw error

  revalidatePath(`/pets/${petId}`)
  // Redirect to edit view so the user can attach photos/videos
  redirect(`/pets/${petId}/log/${entry.id}`)
}

export async function updateLogEntry(
  petId: string,
  entryId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const kind = String(formData.get('kind') ?? 'note') as LogKind
  const severityRaw = emptyToNull(formData.get('severity'))
  const occurredRaw = emptyToNull(formData.get('occurred_at'))

  const { error } = await supabase
    .from('log_entry')
    .update({
      kind,
      severity: severityRaw ? Number(severityRaw) : null,
      occurred_at: occurredRaw ? new Date(occurredRaw).toISOString() : undefined,
      tags: parseTags(String(formData.get('tags') ?? '')),
      body: emptyToNull(formData.get('body')),
      structured: buildStructured(kind, formData),
    })
    .eq('id', entryId)

  if (error) throw error
  revalidatePath(`/pets/${petId}`)
  revalidatePath(`/pets/${petId}/log/${entryId}`)
  redirect(`/pets/${petId}`)
}

export async function deleteLogEntry(petId: string, entryId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('log_entry')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', entryId)
  if (error) throw error
  revalidatePath(`/pets/${petId}`)
  revalidatePath(`/pets/${petId}/log`)
}
