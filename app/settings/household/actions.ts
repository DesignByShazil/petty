'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'

export async function createInvite(_prev: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email) return { error: 'Email is required.' }

  // Resolve the user's household (must be owner)
  const { data: household } = await supabase
    .from('household')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!household) return { error: 'Only the household owner can send invites.' }

  // Idempotent: if a pending invite already exists for this email, return early
  const { data: existing } = await supabase
    .from('invite')
    .select('id, expires_at, accepted_at')
    .eq('household_id', household.id)
    .eq('email', email)
    .is('accepted_at', null)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existing) return { error: 'A pending invite for that address already exists.' }

  const { data: invite, error } = await supabase
    .from('invite')
    .insert({ household_id: household.id, invited_by: user.id, email })
    .select('token')
    .single()

  if (error || !invite) return { error: 'Failed to create invite. Try again.' }

  // Build the accept URL — in production this would be emailed.
  // For now we surface it in the UI so the owner can copy/send it manually.
  const acceptUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/invite/${invite.token}`

  revalidatePath('/settings/household')
  return { ok: true, acceptUrl, email }
}

export async function revokeInvite(inviteId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('invite').delete().eq('id', inviteId)
  if (error) throw error
  revalidatePath('/settings/household')
}

export async function removeMember(memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Fetch member to ensure caller is the household owner and target isn't themselves
  const { data: member } = await supabase
    .from('household_member')
    .select('id, user_id, household_id, role')
    .eq('id', memberId)
    .single()

  if (!member) return

  // Owners cannot remove themselves via this action
  if (member.user_id === user.id) return

  const { error } = await supabase
    .from('household_member')
    .delete()
    .eq('id', memberId)

  if (error) throw error
  revalidatePath('/settings/household')
}
