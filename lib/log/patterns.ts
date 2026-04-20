import type { LogEntry, LogKind } from '@/lib/db/types'

export const PAGE_SIZE = 50
export const PATTERN_WINDOW_DAYS = 7
export const TAG_WINDOW_DAYS = 30

export type DayGroup = {
  /** ISO date string `YYYY-MM-DD` for the local calendar day. */
  date: string
  entries: LogEntry[]
}

export type TagCount = { tag: string; count: number }

export type PatternHighlight = {
  tag: string
  days: number
  window: number
  message: string
}

export type TimelineFilters = {
  kind?: LogKind
  tag?: string
  /** ISO date `YYYY-MM-DD` inclusive start. */
  from?: string
  /** ISO date `YYYY-MM-DD` inclusive end. */
  to?: string
}

function toLocalDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Group entries by local calendar day, preserving their incoming order within each day. */
export function groupByDay(entries: LogEntry[]): DayGroup[] {
  const map = new Map<string, LogEntry[]>()
  const order: string[] = []
  for (const e of entries) {
    const key = toLocalDateKey(e.occurred_at)
    if (!map.has(key)) {
      map.set(key, [])
      order.push(key)
    }
    map.get(key)!.push(e)
  }
  return order.map((date) => ({ date, entries: map.get(date)! }))
}

/** Count tag usage across entries, returning the top N most used tags. */
export function topTags(entries: LogEntry[], limit = 12): TagCount[] {
  const counts = new Map<string, number>()
  for (const e of entries) {
    for (const t of e.tags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (b.count - a.count) || a.tag.localeCompare(b.tag))
    .slice(0, limit)
}

/**
 * Flag tags that appear on a majority of the last `window` days.
 * Uses local calendar days. A tag must show on at least `minDays` distinct days
 * within the window to be highlighted.
 */
export function patternHighlights(
  entries: LogEntry[],
  opts: { now?: Date; window?: number; minDays?: number } = {}
): PatternHighlight[] {
  const now = opts.now ?? new Date()
  const window = opts.window ?? PATTERN_WINDOW_DAYS
  const minDays = opts.minDays ?? Math.ceil(window * 0.6)

  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - (window - 1))
  cutoff.setHours(0, 0, 0, 0)

  const perTag = new Map<string, Set<string>>()
  for (const e of entries) {
    const occurred = new Date(e.occurred_at)
    if (occurred < cutoff) continue
    const dateKey = toLocalDateKey(e.occurred_at)
    for (const tag of e.tags ?? []) {
      if (!perTag.has(tag)) perTag.set(tag, new Set())
      perTag.get(tag)!.add(dateKey)
    }
  }

  const out: PatternHighlight[] = []
  for (const [tag, dates] of perTag) {
    if (dates.size >= minDays) {
      out.push({
        tag,
        days: dates.size,
        window,
        message: `${tag} logged on ${dates.size} of the last ${window} days`,
      })
    }
  }
  out.sort((a, b) => (b.days - a.days) || a.tag.localeCompare(b.tag))
  return out
}

/** Convert filter query params into a plain object, dropping empties. */
export function parseFilters(params: URLSearchParams | Record<string, string | string[] | undefined>): TimelineFilters {
  const get = (k: string): string | undefined => {
    if (params instanceof URLSearchParams) return params.get(k) ?? undefined
    const v = params[k]
    if (Array.isArray(v)) return v[0]
    return v ?? undefined
  }
  const kindRaw = get('kind')
  const allowed: LogKind[] = ['symptom', 'behavior', 'meal', 'stool', 'activity', 'incident', 'note']
  const kind = allowed.includes(kindRaw as LogKind) ? (kindRaw as LogKind) : undefined
  const tag = get('tag')?.trim().toLowerCase() || undefined
  const from = get('from')?.trim() || undefined
  const to = get('to')?.trim() || undefined
  return { kind, tag, from, to }
}

/** Produce a URLSearchParams-ready object for a filter change. */
export function buildQuery(filters: TimelineFilters, page = 0): string {
  const q = new URLSearchParams()
  if (filters.kind) q.set('kind', filters.kind)
  if (filters.tag) q.set('tag', filters.tag)
  if (filters.from) q.set('from', filters.from)
  if (filters.to) q.set('to', filters.to)
  if (page > 0) q.set('page', String(page))
  const s = q.toString()
  return s ? `?${s}` : ''
}
