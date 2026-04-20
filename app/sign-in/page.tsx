'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/db/client'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading || sent) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError('Something went wrong. Try again.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden">
      {/* Soft ambient blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-60"
        style={{ background: 'radial-gradient(circle, #d7e3cf 0%, transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-16 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-50"
        style={{ background: 'radial-gradient(circle, #f0d9c4 0%, transparent 70%)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-white shadow-[0_10px_24px_-12px_rgba(62,84,64,0.6)]">
            <span className="font-display text-xl font-semibold">P</span>
          </div>
          <p className="eyebrow">Welcome</p>
          <h1 className="mt-1 font-display text-4xl leading-none text-[color:var(--ink)]">
            Sign in to Petty
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-[color:var(--ink-soft)]">
            Log symptoms, track patterns, and walk into your vet visit prepared.
          </p>
        </div>

        <div className="surface p-6">
          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                className="rounded-lg bg-[color:var(--accent-soft)] px-4 py-4 text-sm text-[color:var(--accent-ink)]"
              >
                <p className="font-medium">Check your email</p>
                <p className="mt-1 opacity-80">We sent a sign-in link to {email}.</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="space-y-3"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <div>
                  <label htmlFor="email" className="label">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-[color:var(--warm)]"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="btn btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    'Send magic link'
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center text-xs text-[color:var(--ink-mute)]">
          No password needed — we&apos;ll email you a link.
        </p>
      </motion.div>
    </main>
  )
}
