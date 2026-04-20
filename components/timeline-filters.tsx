'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { LOG_KINDS, type LogKind } from '@/lib/db/types'

const inputClass =
  'rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100'

export function TimelineFilters({ basePath }: { basePath: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, start] = useTransition()

  const kind = searchParams.get('kind') ?? ''
  const tag = searchParams.get('tag') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    // Filter changes reset pagination
    params.delete('page')
    const qs = params.toString()
    start(() => {
      router.replace(qs ? `${basePath}?${qs}` : basePath)
    })
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-medium text-stone-600">Kind</label>
        <select
          aria-label="Filter by kind"
          className={inputClass}
          value={kind}
          onChange={(e) => update({ kind: e.target.value })}
        >
          <option value="">Any</option>
          {LOG_KINDS.map((k: LogKind) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>

        <label className="text-xs font-medium text-stone-600">Tag</label>
        <input
          aria-label="Filter by tag"
          className={inputClass}
          placeholder="e.g. scratching"
          defaultValue={tag}
          onBlur={(e) => {
            const val = e.target.value.trim().toLowerCase()
            if (val !== tag) update({ tag: val })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const val = (e.currentTarget.value ?? '').trim().toLowerCase()
              if (val !== tag) update({ tag: val })
            }
          }}
        />

        <label className="text-xs font-medium text-stone-600">From</label>
        <input
          type="date"
          aria-label="From date"
          className={inputClass}
          value={from}
          onChange={(e) => update({ from: e.target.value })}
        />

        <label className="text-xs font-medium text-stone-600">To</label>
        <input
          type="date"
          aria-label="To date"
          className={inputClass}
          value={to}
          onChange={(e) => update({ to: e.target.value })}
        />

        {(kind || tag || from || to) && (
          <button
            type="button"
            className="text-xs text-stone-500 underline hover:text-stone-900"
            onClick={() => update({ kind: '', tag: '', from: '', to: '' })}
          >
            Clear
          </button>
        )}

        {pending && <span className="text-xs text-stone-400">Loading</span>}
      </div>
    </div>
  )
}
