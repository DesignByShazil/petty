'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { resolveProvider } from '@/lib/ai/providers/claude'
import type { SummaryInput } from '@/lib/ai/summary'
import type { SummaryKind } from '@/lib/db/types'

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}

function parseKind(raw: FormDataEntryValue | null): SummaryKind {
  const s = String(raw ?? '')
  if (s === 'vet_visit' || s === 'range' || s === 'issue') return s
  return 'vet_visit'
}

function rangeFromForm(formData: FormData): { rangeStart: string; rangeEnd: string } {
  const start = emptyToNull(formData.get('range_start'))
  const end = emptyToNull(formData.get('range_end'))
  const now = new Date()
  const defaultEnd = end ? new Date(end) : now
  // Default: last 14 days
  const defaultStart = start ? new Date(start) : new Date(defaultEnd.getTime() - 14 * 24 * 60 * 60 * 1000)
  const endExclusive = new Date(defaultEnd)
  // If end was provided as a date without time, push to end of day
  if (end && end.length === 10) endExclusive.setHours(23, 59, 59, 999)
  return {
    rangeStart: defaultStart.toISOString(),
    rangeEnd: endExclusive.toISOString(),
  }
}

export async function generateSummary(petId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const kind = parseKind(formData.get('kind'))
  const { rangeStart, rangeEnd } = rangeFromForm(formData)
  const issueFocus = emptyToNull(formData.get('issue_focus')) ?? undefined

  const { data: pet } = await supabase
    .from('pet')
    .select('id, name, species, breed, sex, date_of_birth, weight_kg, vet_name, vet_contact, notes, updated_at')
    .eq('id', petId)
    .is('deleted_at', null)
    .single()
  if (!pet) throw new Error('Pet not found')

  const [{ data: conditions }, { data: medications }, { data: entries }] = await Promise.all([
    supabase
      .from('condition')
      .select('label, status, started_on, notes')
      .eq('pet_id', petId),
    supabase
      .from('medication')
      .select('name, dose_amount, schedule, active')
      .eq('pet_id', petId),
    supabase
      .from('log_entry')
      .select('id, kind, severity, occurred_at, tags, body, structured')
      .eq('pet_id', petId)
      .is('deleted_at', null)
      .gte('occurred_at', rangeStart)
      .lte('occurred_at', rangeEnd)
      .order('occurred_at', { ascending: true })
      .limit(500),
  ])

  const input: SummaryInput = {
    pet,
    conditions: conditions ?? [],
    medications: medications ?? [],
    entries: entries ?? [],
    kind,
    rangeStart,
    rangeEnd,
    issueFocus,
  }

  const provider = resolveProvider()
  const result = await provider.generate(input)

  const { data: saved, error } = await supabase
    .from('summary')
    .insert({
      pet_id: petId,
      author_id: user.id,
      kind,
      status: result.status,
      range_start: rangeStart,
      range_end: rangeEnd,
      issue_focus: issueFocus ?? null,
      markdown: result.markdown,
      model: result.model,
      prompt_version: result.promptVersion,
      input_entry_ids: result.inputEntryIds,
      usage: (result.usage ?? {}) as unknown as never,
    })
    .select('id')
    .single()

  if (error || !saved) throw error ?? new Error('Failed to save summary')

  revalidatePath(`/pets/${petId}`)
  redirect(`/pets/${petId}/summary/${saved.id}`)
}

export async function deleteSummary(petId: string, summaryId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('summary').delete().eq('id', summaryId)
  if (error) throw error
  revalidatePath(`/pets/${petId}`)
  redirect(`/pets/${petId}`)
}
