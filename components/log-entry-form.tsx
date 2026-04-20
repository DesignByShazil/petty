'use client'

import { useState } from 'react'
import type { LogEntry, LogKind } from '@/lib/db/types'
import { LOG_KINDS } from '@/lib/db/types'

const inputClass =
  'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100'

const labelClass = 'block text-xs font-medium text-stone-600 mb-1'

type Structured = Record<string, unknown>

type Props = {
  action: (formData: FormData) => void | Promise<void>
  entry?: LogEntry
  submitLabel: string
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function nowLocalDatetime(): string {
  return toLocalDatetime(new Date().toISOString())
}

export function LogEntryForm({ action, entry, submitLabel }: Props) {
  const [kind, setKind] = useState<LogKind>(entry?.kind ?? 'symptom')
  const structured = (entry?.structured ?? {}) as Structured

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="kind" className={labelClass}>Kind</label>
          <select
            id="kind"
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as LogKind)}
            className={inputClass}
          >
            {LOG_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="occurred_at" className={labelClass}>When</label>
          <input
            id="occurred_at"
            name="occurred_at"
            type="datetime-local"
            defaultValue={
              entry ? toLocalDatetime(entry.occurred_at) : nowLocalDatetime()
            }
            className={inputClass}
          />
        </div>
      </div>

      {(kind === 'symptom' || kind === 'behavior' || kind === 'incident') && (
        <div>
          <label htmlFor="severity" className={labelClass}>Severity (1–5)</label>
          <input
            id="severity"
            name="severity"
            type="number"
            min="1"
            max="5"
            defaultValue={entry?.severity ?? ''}
            className={inputClass}
            placeholder="3"
          />
        </div>
      )}

      {/* Kind-specific structured fields */}
      {kind === 'symptom' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="area" className={labelClass}>Area</label>
            <input
              id="area"
              name="area"
              defaultValue={(structured.area as string) ?? ''}
              placeholder="ears, paws, belly"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="duration_minutes" className={labelClass}>Duration (min)</label>
            <input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min="0"
              defaultValue={(structured.duration_minutes as number) ?? ''}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {kind === 'meal' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="food" className={labelClass}>Food</label>
              <input
                id="food"
                name="food"
                defaultValue={(structured.food as string) ?? ''}
                placeholder="Hill's z/d"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="amount_g" className={labelClass}>Amount (g)</label>
              <input
                id="amount_g"
                name="amount_g"
                type="number"
                min="0"
                defaultValue={(structured.amount_g as number) ?? ''}
                className={inputClass}
                placeholder="150"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="finished"
              defaultChecked={structured.finished === true}
              className="rounded border-stone-300"
            />
            Finished the meal
          </label>
        </div>
      )}

      {kind === 'stool' && (
        <div className="space-y-3">
          <div>
            <label htmlFor="bristol_score" className={labelClass}>Bristol score (1–7)</label>
            <input
              id="bristol_score"
              name="bristol_score"
              type="number"
              min="1"
              max="7"
              defaultValue={(structured.bristol_score as number) ?? ''}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="has_blood"
              defaultChecked={structured.has_blood === true}
              className="rounded border-stone-300"
            />
            Blood present
          </label>
        </div>
      )}

      {kind === 'activity' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="activity_type" className={labelClass}>Type</label>
            <input
              id="activity_type"
              name="activity_type"
              defaultValue={(structured.type as string) ?? ''}
              placeholder="walk, play, run"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="minutes" className={labelClass}>Minutes</label>
            <input
              id="minutes"
              name="minutes"
              type="number"
              min="0"
              defaultValue={(structured.minutes as number) ?? ''}
              className={inputClass}
              placeholder="30"
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="tags" className={labelClass}>Tags</label>
        <input
          id="tags"
          name="tags"
          defaultValue={entry?.tags?.join(' ') ?? ''}
          className={inputClass}
          placeholder="scratching ears hind-leg"
        />
        <p className="text-xs text-stone-400 mt-1">Separated by spaces or commas.</p>
      </div>

      <div>
        <label htmlFor="body" className={labelClass}>Note</label>
        <textarea
          id="body"
          name="body"
          rows={3}
          defaultValue={entry?.body ?? ''}
          className={inputClass}
          placeholder="What did you notice?"
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
      >
        {submitLabel}
      </button>
    </form>
  )
}
