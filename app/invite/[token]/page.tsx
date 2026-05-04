import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/db/server'

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Validate the token before anything else (works even when unauthenticated)
  const { data: invite } = await supabase
    .from('invite')
    .select('id, email, expires_at, accepted_at, household(name)')
    .eq('token', token)
    .maybeSingle()

  const isExpired = invite && new Date(invite.expires_at) < new Date()
  const isUsed = !!invite?.accepted_at
  const isInvalid = !invite || isExpired || isUsed

  // Not signed in — send to sign-in then back here
  if (!user) {
    redirect(`/sign-in?next=/invite/${token}`)
  }

  // Token already consumed or invalid — show an error
  if (isInvalid) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="surface w-full max-w-sm p-8 text-center space-y-4">
          <p className="eyebrow">Invite</p>
          <h1 className="font-display" style={{ fontSize: '1.75rem', color: 'var(--ink)' }}>
            This link isn&apos;t valid
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            {isExpired ? 'This invite expired.' : isUsed ? 'This invite has already been used.' : 'The link is invalid.'}
            {' '}Ask the household owner to send a new one.
          </p>
          <Link href="/pets" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            Go to my pets
          </Link>
        </div>
      </main>
    )
  }

  // Call the SECURITY DEFINER function to accept the invite
  const { data: result, error } = await supabase.rpc('accept_invite', { p_token: token })

  if (error || result !== 'ok') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="surface w-full max-w-sm p-8 text-center space-y-4">
          <p className="eyebrow">Invite</p>
          <h1 className="font-display" style={{ fontSize: '1.75rem', color: 'var(--ink)' }}>
            Something went wrong
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            {result === 'invalid' ? 'This invite has expired or already been used.' : 'Try again or ask the owner to resend.'}
          </p>
          <Link href="/pets" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            Go to my pets
          </Link>
        </div>
      </main>
    )
  }

  const householdName = (invite.household as unknown as { name: string } | null)?.name ?? 'the household'

  // Success — redirect to pets list (they can now see shared pets)
  redirect(`/pets?joined=${encodeURIComponent(householdName)}`)
}
