'use client'

import { useActionState, useState } from 'react'
import { createInvite, revokeInvite, removeMember } from './actions'
import Link from 'next/link'

type Member = {
  id: string
  user_id: string | null
  role: string
  invited_email: string | null
  users: { email: string | null; display_name: string | null } | null
}

type PendingInvite = {
  id: string
  email: string
  token: string
  expires_at: string
  created_at: string
}

type InviteState = {
  error?: string
  ok?: boolean
  acceptUrl?: string
  email?: string
} | null

const inputClass =
  'w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--bg-elevated)] px-3 py-2 text-sm outline-none transition-all focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]'

const labelClass = 'label'

function memberLabel(m: Member): string {
  return m.users?.display_name ?? m.users?.email ?? m.invited_email ?? 'Unknown'
}

function InviteForm({ householdName }: { householdName: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvite, null)
  const [copied, setCopied] = useState(false)

  async function copy(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <form action={action} className="flex gap-2">
        <div className="flex-1">
          <input
            name="email"
            type="email"
            required
            placeholder="caretaker@example.com"
            className={inputClass}
            key={state?.ok ? 'reset' : 'form'}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-sage whitespace-nowrap"
          style={{ padding: '0.55rem 1rem', fontSize: '0.875rem' }}
        >
          {pending ? 'Sending…' : 'Send invite'}
        </button>
      </form>

      {state?.error && (
        <p className="text-sm" style={{ color: 'var(--warm)' }}>{state.error}</p>
      )}

      {state?.ok && state.acceptUrl && (
        <div
          className="rounded-lg p-4 space-y-2"
          style={{ background: 'var(--accent-soft)', border: '1px solid #c9dbc6' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--accent-ink)' }}>
            Invite created for {state.email}
          </p>
          <p className="text-xs" style={{ color: 'var(--accent-ink)', opacity: 0.8 }}>
            Copy this link and send it to them. It expires in 7 days.
          </p>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 rounded px-2 py-1 text-xs truncate"
              style={{ background: 'rgba(255,255,255,0.6)', color: 'var(--ink)' }}
            >
              {state.acceptUrl}
            </code>
            <button
              type="button"
              onClick={() => copy(state.acceptUrl!)}
              className="btn btn-ghost text-xs"
              style={{ border: '1px solid var(--line)', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function HouseholdSettingsClient({
  householdName,
  isOwner,
  currentUserId,
  members,
  pendingInvites,
}: {
  householdName: string
  isOwner: boolean
  currentUserId: string
  members: Member[]
  pendingInvites: PendingInvite[]
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-[80px] py-14 space-y-10">
      <div className="anim-fade-up">
        <Link
          href="/pets"
          className="text-sm"
          style={{ color: 'var(--ink-soft)' }}
        >
          ← My pets
        </Link>
        <p className="eyebrow mt-6">Settings</p>
        <h1
          className="font-display mt-1"
          style={{ fontSize: '2rem', lineHeight: 1, color: 'var(--ink)' }}
        >
          {householdName}
        </h1>
      </div>

      {/* Member list */}
      <section className="anim-fade-up" style={{ animationDelay: '60ms' }}>
        <p className="eyebrow mb-3">Members</p>
        <div className="surface overflow-hidden">
          {members.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < members.length - 1 ? '1px solid var(--line-soft)' : 'none' }}
            >
              {/* Avatar initial */}
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
                style={{ background: m.role === 'owner' ? 'var(--accent)' : 'var(--ink-mute)' }}
              >
                {memberLabel(m).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  {memberLabel(m)}
                  {m.user_id === currentUserId && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--ink-mute)' }}>
                      (you)
                    </span>
                  )}
                </p>
                <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{m.role}</p>
              </div>
              {isOwner && m.user_id !== currentUserId && m.role !== 'owner' && (
                <form action={removeMember.bind(null, m.id)}>
                  <button
                    type="submit"
                    className="text-xs"
                    style={{ color: 'var(--ink-mute)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseOver={(e) => (e.currentTarget.style.color = 'var(--warm)')}
                    onMouseOut={(e) => (e.currentTarget.style.color = 'var(--ink-mute)')}
                  >
                    Remove
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Invite section — owner only */}
      {isOwner && (
        <>
          <section className="anim-fade-up" style={{ animationDelay: '120ms' }}>
            <p className="eyebrow mb-3">Invite a caretaker</p>
            <div className="surface p-5">
              <InviteForm householdName={householdName} />
            </div>
          </section>

          {pendingInvites.length > 0 && (
            <section className="anim-fade-up" style={{ animationDelay: '180ms' }}>
              <p className="eyebrow mb-3">Pending invites</p>
              <div className="surface overflow-hidden">
                {pendingInvites.map((inv, i) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < pendingInvites.length - 1 ? '1px solid var(--line-soft)' : 'none' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm" style={{ color: 'var(--ink)' }}>{inv.email}</p>
                      <p className="text-xs" style={{ color: 'var(--ink-mute)' }}>
                        Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <form action={revokeInvite.bind(null, inv.id)}>
                      <button
                        type="submit"
                        className="text-xs"
                        style={{ color: 'var(--ink-mute)', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseOver={(e) => (e.currentTarget.style.color = 'var(--warm)')}
                        onMouseOut={(e) => (e.currentTarget.style.color = 'var(--ink-mute)')}
                      >
                        Revoke
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
