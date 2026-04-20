import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { signedUrlsForPaths } from '../log/[entryId]/media-actions'
import { TimelineFilters } from '@/components/timeline-filters'
import {
  PAGE_SIZE,
  TAG_WINDOW_DAYS,
  groupByDay,
  patternHighlights,
  topTags,
  parseFilters,
} from '@/lib/log/patterns'
import type { LogEntry } from '@/lib/db/types'

type MediaRow = {
  id: string
  log_entry_id: string
  mime_type: string
  storage_path: string
}

function formatDayHeading(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: pet } = await supabase
    .from('pet')
    .select('id, name')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (!pet) notFound()

  const filters = parseFilters(sp)
  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page
  const page = Math.max(0, Number(pageRaw ?? 0) || 0)

  let q = supabase
    .from('log_entry')
    .select('*')
    .eq('pet_id', id)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })

  if (filters.kind) q = q.eq('kind', filters.kind)
  if (filters.tag) q = q.contains('tags', [filters.tag])
  if (filters.from) q = q.gte('occurred_at', new Date(filters.from).toISOString())
  if (filters.to) {
    const end = new Date(filters.to)
    end.setDate(end.getDate() + 1)
    q = q.lt('occurred_at', end.toISOString())
  }

  const { data: entries } = await q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
  const list: LogEntry[] = (entries ?? []) as LogEntry[]

  // Pattern/tag aggregates use the last 30 days, ignoring active filters, so
  // owners always see the big picture even while filtering.
  const since = new Date()
  since.setDate(since.getDate() - TAG_WINDOW_DAYS)
  const { data: recentForStats } = await supabase
    .from('log_entry')
    .select('id, occurred_at, tags')
    .eq('pet_id', id)
    .is('deleted_at', null)
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(500)

  const statsEntries = (recentForStats ?? []) as unknown as LogEntry[]
  const tags = topTags(statsEntries, 12)
  const highlights = patternHighlights(statsEntries)

  const entryIds = list.map((e) => e.id)
  const { data: mediaRows } = entryIds.length
    ? await supabase
        .from('media')
        .select('id, log_entry_id, mime_type, storage_path')
        .in('log_entry_id', entryIds)
        .order('created_at', { ascending: true })
    : { data: [] as MediaRow[] }

  const urlMap = await signedUrlsForPaths((mediaRows ?? []).map((m) => m.storage_path))
  const mediaByEntry: Record<string, Array<MediaRow & { signedUrl?: string }>> = {}
  for (const m of (mediaRows ?? []) as MediaRow[]) {
    if (!mediaByEntry[m.log_entry_id]) mediaByEntry[m.log_entry_id] = []
    mediaByEntry[m.log_entry_id].push({ ...m, signedUrl: urlMap[m.storage_path] })
  }

  const groups = groupByDay(list)
  const basePath = `/pets/${pet.id}/timeline`
  const spQuery = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (k === 'page') continue
    const val = Array.isArray(v) ? v[0] : v
    if (val) spQuery.set(k, val)
  }
  const withPage = (p: number) => {
    const q = new URLSearchParams(spQuery)
    if (p > 0) q.set('page', String(p))
    const s = q.toString()
    return s ? `${basePath}?${s}` : basePath
  }

  const hasMore = list.length === PAGE_SIZE

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-8">
      <div>
        <Link href={`/pets/${pet.id}`} className="text-sm text-stone-500 hover:text-stone-700">
          ← {pet.name}
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Timeline</h1>
        <p className="text-sm text-stone-500">
          Everything logged for {pet.name}, newest first.
        </p>
      </div>

      {highlights.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-stone-700 mb-3 uppercase tracking-wide">
            Pattern highlights
          </h2>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            {highlights.map((h) => (
              <p key={h.tag} className="text-sm text-amber-900">
                <span className="font-medium">{h.tag}</span> logged on {h.days} of the last {h.window} days.
              </p>
            ))}
          </div>
        </section>
      )}

      {tags.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-stone-700 mb-3 uppercase tracking-wide">
            Tags — last {TAG_WINDOW_DAYS} days
          </h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link
                key={t.tag}
                href={`${basePath}?tag=${encodeURIComponent(t.tag)}`}
                className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700 hover:bg-stone-200"
              >
                #{t.tag} <span className="text-stone-400">· {t.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <TimelineFilters basePath={basePath} />

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-stone-500">
            No entries match these filters. Try widening the date range or clearing the tag.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.date}>
              <h3 className="sticky top-0 bg-stone-50 py-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                {formatDayHeading(g.date)}
              </h3>
              <ul className="mt-2 space-y-2">
                {g.entries.map((e) => {
                  const media = mediaByEntry[e.id] ?? []
                  return (
                    <li
                      key={e.id}
                      className="rounded-lg border border-stone-200 bg-white px-4 py-3"
                    >
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 font-medium text-stone-700">
                          {e.kind}
                        </span>
                        {e.severity != null && <span>severity {e.severity}/5</span>}
                        <span>·</span>
                        <span>{formatTime(e.occurred_at)}</span>
                        <Link
                          href={`/pets/${pet.id}/log/${e.id}`}
                          className="ml-auto text-stone-400 hover:text-stone-900"
                        >
                          Open
                        </Link>
                      </div>
                      {e.body && <p className="mt-1 text-sm text-stone-800">{e.body}</p>}
                      {e.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {e.tags.map((t) => (
                            <Link
                              key={t}
                              href={`${basePath}?tag=${encodeURIComponent(t)}`}
                              className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-200"
                            >
                              #{t}
                            </Link>
                          ))}
                        </div>
                      )}
                      {media.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {media.map((m) => (
                            <div
                              key={m.id}
                              className="h-16 w-16 overflow-hidden rounded-md border border-stone-200 bg-stone-100"
                            >
                              {m.mime_type.startsWith('video/') ? (
                                <video
                                  src={m.signedUrl}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                />
                              ) : m.signedUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.signedUrl} alt="" className="h-full w-full object-cover" />
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <nav className="flex items-center justify-between pt-2">
        {page > 0 ? (
          <Link
            href={withPage(page - 1)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100"
          >
            ← Newer
          </Link>
        ) : <span />}
        <span className="text-xs text-stone-400">Page {page + 1}</span>
        {hasMore ? (
          <Link
            href={withPage(page + 1)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100"
          >
            Older →
          </Link>
        ) : <span />}
      </nav>
    </main>
  )
}
