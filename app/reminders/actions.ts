'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/server'
import type { DoseOutcome } from '@/lib/db/types'

export async function resolveReminder(
  reminderId: string,
  outcome: DoseOutcome
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data: reminder, error: rErr } = await supabase
    .from('reminder')
    .select('id, pet_id, medication_id, kind')
    .eq('id', reminderId)
    .single()
  if (rErr || !reminder) throw rErr ?? new Error('Reminder not found')

  const status = outcome === 'given' ? 'done' : 'skipped'

  const { error: updateErr } = await supabase
    .from('reminder')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', reminderId)
  if (updateErr) throw updateErr

  // Medication reminders generate a dose row for adherence tracking
  if (reminder.kind === 'medication' && reminder.medication_id) {
    const { error: doseErr } = await supabase.from('medication_dose').insert({
      medication_id: reminder.medication_id,
      pet_id: reminder.pet_id,
      reminder_id: reminder.id,
      given_by: user.id,
      outcome,
    })
    if (doseErr) throw doseErr
  }

  revalidatePath('/reminders')
  revalidatePath('/pets')
  revalidatePath(`/pets/${reminder.pet_id}`)
}

export async function deleteReminder(reminderId: string) {
  const supabase = await createClient()
  const { data: rem } = await supabase
    .from('reminder')
    .select('pet_id')
    .eq('id', reminderId)
    .single()
  const { error } = await supabase.from('reminder').delete().eq('id', reminderId)
  if (error) throw error
  revalidatePath('/reminders')
  if (rem?.pet_id) revalidatePath(`/pets/${rem.pet_id}`)
}
