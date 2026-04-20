import type { Json, LogKind } from '@/lib/db/types'

export type SymptomStructured = { area?: string; duration_minutes?: number }
export type MealStructured = { food?: string; amount_g?: number; finished?: boolean }
export type StoolStructured = { bristol_score?: number; has_blood?: boolean }
export type ActivityStructured = { type?: string; minutes?: number }

export type Structured =
  | ({ kind: 'symptom' } & SymptomStructured)
  | ({ kind: 'meal' } & MealStructured)
  | ({ kind: 'stool' } & StoolStructured)
  | ({ kind: 'activity' } & ActivityStructured)
  | { kind: 'behavior' | 'incident' | 'note' }

function str(v: FormDataEntryValue | null): string | undefined {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? undefined : s
}

function num(v: FormDataEntryValue | null): number | undefined {
  const s = str(v)
  if (s === undefined) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function stripUndefined(obj: Record<string, unknown>): Json {
  const out: Record<string, Json> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    out[k] = v as Json
  }
  return out
}

/**
 * Extract kind-specific structured data from a FormData.
 * Returns a JSON-safe object (no `kind` key, no undefineds) for the `structured` JSONB column.
 */
export function buildStructured(kind: LogKind, formData: FormData): Json {
  switch (kind) {
    case 'symptom':
      return stripUndefined({
        area: str(formData.get('area')),
        duration_minutes: num(formData.get('duration_minutes')),
      })
    case 'meal':
      return stripUndefined({
        food: str(formData.get('food')),
        amount_g: num(formData.get('amount_g')),
        finished: formData.get('finished') === 'on' ? true : undefined,
      })
    case 'stool':
      return stripUndefined({
        bristol_score: num(formData.get('bristol_score')),
        has_blood: formData.get('has_blood') === 'on' ? true : undefined,
      })
    case 'activity':
      return stripUndefined({
        type: str(formData.get('activity_type')),
        minutes: num(formData.get('minutes')),
      })
    default:
      return {}
  }
}

/**
 * Parse a comma- or whitespace-separated tag string into a deduped list.
 */
export function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}
