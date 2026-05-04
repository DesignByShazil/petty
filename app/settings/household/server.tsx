import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { HouseholdSettingsClient } from './client'

export async function HouseholdSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: household } = await supabase
    .from('household')
    .select('id, name, owner_id')
    .eq('owner_id', user.id)
    .maybeSingle()

  // If user is not the owner, show read-only household info
  const { data: memberRecord } = await supabase
    .from('household_member')
    .select('household_id, role, household(id, name, owner_id)')
    .eq('user_id', user.id)
    .single()

  const activeHousehold = household ?? (memberRecord?.household as unknown as { id: string; name: string; owner_id: string } | null)
  if (!activeHousehold) redirect('/pets')

  const isOwner = activeHousehold.owner_id === user.id

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from('household_member')
      .select('id, user_id, role, invited_email, users(email, display_name)')
      .eq('household_id', activeHousehold.id)
      .order('created_at', { ascending: true }),
    isOwner
      ? supabase
          .from('invite')
          .select('id, email, token, expires_at, accepted_at, created_at')
          .eq('household_id', activeHousehold.id)
          .order('created_at', { ascending: false })
          .limit(20)
      : { data: [] },
  ])

  return (
    <HouseholdSettingsClient
      householdName={activeHousehold.name}
      isOwner={isOwner}
      currentUserId={user.id}
      members={(members ?? []) as unknown as Array<{
        id: string
        user_id: string | null
        role: string
        invited_email: string | null
        users: { email: string | null; display_name: string | null } | null
      }>}
      pendingInvites={(invites ?? []).filter((i) => !i.accepted_at && new Date(i.expires_at) > new Date()) as Array<{
        id: string
        email: string
        token: string
        expires_at: string
        created_at: string
      }>}
    />
  )
}
