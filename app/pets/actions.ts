'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import type { Species, Sex, ConditionStatus } from '@/lib/db/types'
import { remindersForMedication } from '@/lib/reminders/generate'

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}

export async function createPet(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: household } = await supabase
    .from('household')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .single()

  if (!household) throw new Error('No household found for user')

  const name = String(formData.get('name') ?? '').trim()
  const species = String(formData.get('species') ?? 'dog') as Species
  if (!name) throw new Error('Name required')

  const weight = emptyToNull(formData.get('weight_kg'))

  const { data: pet, error } = await supabase
    .from('pet')
    .insert({
      household_id: household.id,
      name,
      species,
      breed: emptyToNull(formData.get('breed')),
      sex: (String(formData.get('sex') ?? 'unknown') as Sex),
      date_of_birth: emptyToNull(formData.get('date_of_birth')),
      weight_kg: weight ? Number(weight) : null,
      vet_name: emptyToNull(formData.get('vet_name')),
      vet_contact: emptyToNull(formData.get('vet_contact')),
      notes: emptyToNull(formData.get('notes')),
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath('/pets')
  redirect(`/pets/${pet.id}`)
}

export async function updatePet(petId: string, formData: FormData) {
  const supabase = await createClient()
  const weight = emptyToNull(formData.get('weight_kg'))

  const { error } = await supabase
    .from('pet')
    .update({
      name: String(formData.get('name') ?? '').trim(),
      species: String(formData.get('species') ?? 'dog') as Species,
      breed: emptyToNull(formData.get('breed')),
      sex: String(formData.get('sex') ?? 'unknown') as Sex,
      date_of_birth: emptyToNull(formData.get('date_of_birth')),
      weight_kg: weight ? Number(weight) : null,
      vet_name: emptyToNull(formData.get('vet_name')),
      vet_contact: emptyToNull(formData.get('vet_contact')),
      notes: emptyToNull(formData.get('notes')),
    })
    .eq('id', petId)

  if (error) throw error
  revalidatePath(`/pets/${petId}`)
}

export async function addCondition(petId: string, formData: FormData) {
  const supabase = await createClient()
  const label = String(formData.get('label') ?? '').trim()
  if (!label) return

  const { error } = await supabase.from('condition').insert({
    pet_id: petId,
    label,
    status: (String(formData.get('status') ?? 'active') as ConditionStatus),
    started_on: emptyToNull(formData.get('started_on')),
    notes: emptyToNull(formData.get('notes')),
  })
  if (error) throw error
  revalidatePath(`/pets/${petId}`)
}

export async function removeCondition(petId: string, conditionId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('condition').delete().eq('id', conditionId)
  if (error) throw error
  revalidatePath(`/pets/${petId}`)
}

export async function addMedication(petId: string, formData: FormData) {
  const supabase = await createClient()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  const schedule = emptyToNull(formData.get('schedule'))
  const startDate = emptyToNull(formData.get('start_date'))

  const { data: med, error } = await supabase
    .from('medication')
    .insert({
      pet_id: petId,
      name,
      dose_amount: emptyToNull(formData.get('dose_amount')),
      schedule,
      start_date: startDate,
      prescribed_by: emptyToNull(formData.get('prescribed_by')),
    })
    .select('id, active, end_date')
    .single()
  if (error || !med) throw error ?? new Error('Failed to add medication')

  if (med.active) {
    const reminders = remindersForMedication({
      petId,
      medicationId: med.id,
      medicationName: name,
      schedule,
      startDate,
      endDate: med.end_date,
    })
    if (reminders.length) {
      const { error: rErr } = await supabase.from('reminder').insert(reminders)
      if (rErr) throw rErr
    }
  }

  revalidatePath(`/pets/${petId}`)
  revalidatePath('/reminders')
}

export async function removeMedication(petId: string, medicationId: string) {
  const supabase = await createClient()
  // Cascade will clear reminders via FK on delete cascade
  const { error } = await supabase.from('medication').delete().eq('id', medicationId)
  if (error) throw error
  revalidatePath(`/pets/${petId}`)
  revalidatePath('/reminders')
}

export async function toggleMedicationActive(petId: string, medicationId: string, active: boolean) {
  const supabase = await createClient()
  const { data: med, error } = await supabase
    .from('medication')
    .update({ active })
    .eq('id', medicationId)
    .select('name, schedule, start_date, end_date')
    .single()
  if (error || !med) throw error ?? new Error('Medication not found')

  if (!active) {
    // Clear pending reminders when deactivated
    await supabase
      .from('reminder')
      .delete()
      .eq('medication_id', medicationId)
      .eq('status', 'pending')
  } else {
    // Re-generate on reactivation
    const reminders = remindersForMedication({
      petId,
      medicationId,
      medicationName: med.name,
      schedule: med.schedule,
      startDate: med.start_date,
      endDate: med.end_date,
    })
    if (reminders.length) await supabase.from('reminder').insert(reminders)
  }

  revalidatePath(`/pets/${petId}`)
  revalidatePath('/reminders')
}
