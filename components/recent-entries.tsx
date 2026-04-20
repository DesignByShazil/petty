import Link from 'next/link'
import type { LogEntry } from '@/lib/db/types'
import { deleteLogEntry } from '@/app/pets/[id]/log/actions'

type MediaPreview = {
  id: string
  mime_type: string
  storage_path: string
  signedUrl?: string
}

function when(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function RecentEntries({
  petId,
  entries,
  currentUserId,
  mediaByEntry,
}: {
  petId: string
  entries: LogEntry[]
  currentUserId: string
  mediaByEntry: Record<string, MediaPreview[]>
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-stone-700 uppercase tracking-wide">
          Recent entries
        </h2>
        <Link
          href={`/pets/${petId}/log`}
          className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
        >
          New entry
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white px-6 py-8 text-center">
          <p className="text-sm text-stone-500">
            No entries yet. Log something you&apos;ve noticed.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const mine = e.author_id === currentUserId
            const remove = deleteLogEntry.bind(null, petId, e.id)
            const media = mediaByEntry[e.id] ?? []
            return (
              <li
                key={e.id}
                className="rounded-lg border border-stone-200 bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 font-medium text-stone-700">
                        {e.kind}
                      </span>
                      {e.severity != null && (
                        <span>severity {e.severity}/5</span>
                      )}
                      <span>·</span>
                      <span>{when(e.occurred_at)}</span>
                    </div>
                    {e.body && (
                      <p className="mt-1 text-sm text-stone-800">{e.body}</p>
                    )}
                    {e.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {e.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                    {media.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {media.map((m) => (
                          <div
                            key={m.id}
                            className="h-16 w-16 rounded-md overflow-hidden bg-stone-100 border border-stone-200"
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
                              <img
                                src={m.signedUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {mine && (
                    <div className="flex gap-3 text-xs">
                      <Link
                        href={`/pets/${petId}/log/${e.id}`}
                        className="text-stone-500 hover:text-stone-900"
                      >
                        Edit
                      </Link>
                      <form action={remove}>
                        <button
                          type="submit"
                          className="text-stone-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
