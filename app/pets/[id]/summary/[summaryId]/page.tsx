import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { deleteSummary } from '../actions'

function renderMarkdown(md: string): string {
  // Minimal, safe rendering: escape then convert headings, bullets, bold, italics.
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  const lines = esc(md).split('\n')
  const out: string[] = []
  let inList = false

  for (const raw of lines) {
    const line = raw.trimEnd()
    const closeList = () => {
      if (inList) { out.push('</ul>'); inList = false }
    }
    if (/^#\s+/.test(line)) {
      closeList()
      out.push(`<h1 class="text-2xl font-semibold mt-4">${line.replace(/^#\s+/, '')}</h1>`)
    } else if (/^##\s+/.test(line)) {
      closeList()
      out.push(`<h2 class="text-sm font-medium uppercase tracking-wide text-stone-700 mt-6">${line.replace(/^##\s+/, '')}</h2>`)
    } else if (/^-\s+/.test(line)) {
      if (!inList) { out.push('<ul class="list-disc pl-5 space-y-1 text-sm text-stone-800">'); inList = true }
      out.push(`<li>${line.replace(/^-\s+/, '')}</li>`)
    } else if (line === '') {
      closeList()
      out.push('')
    } else {
      closeList()
      out.push(`<p class="text-sm text-stone-800">${line}</p>`)
    }
  }
  if (inList) out.push('</ul>')
  return out
    .join('\n')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
}

export default async function SummaryDetailPage({
  params,
}: {
  params: Promise<{ id: string; summaryId: string }>
}) {
  const { id, summaryId } = await params
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

  const { data: summary } = await supabase
    .from('summary')
    .select('*')
    .eq('id', summaryId)
    .single()
  if (!summary) notFound()

  const remove = deleteSummary.bind(null, pet.id, summary.id)
  const html = renderMarkdown(summary.markdown)
  const usage = (summary.usage ?? {}) as Record<string, number>

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <div>
        <Link href={`/pets/${pet.id}`} className="text-sm text-stone-500 hover:text-stone-700">
          ← {pet.name}
        </Link>
      </div>

      <article
        className="rounded-xl border border-stone-200 bg-white p-8 space-y-2"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-500 space-y-1">
        <p><span className="font-medium text-stone-700">Model:</span> {summary.model}</p>
        <p><span className="font-medium text-stone-700">Prompt:</span> {summary.prompt_version}</p>
        <p><span className="font-medium text-stone-700">Entries used:</span> {summary.input_entry_ids.length}</p>
        <p><span className="font-medium text-stone-700">Status:</span> {summary.status}</p>
        {usage.inputTokens != null && (
          <p>
            <span className="font-medium text-stone-700">Tokens:</span> in {usage.inputTokens}, out {usage.outputTokens ?? 0}
            {usage.cacheReadInputTokens ? `, cache read ${usage.cacheReadInputTokens}` : ''}
            {usage.cacheCreationInputTokens ? `, cache write ${usage.cacheCreationInputTokens}` : ''}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <a
          href={`/api/pets/${pet.id}/summary/${summary.id}/pdf`}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm text-stone-800 hover:bg-stone-100"
        >
          Download PDF
        </a>
        <form action={remove}>
          <button
            type="submit"
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </form>
      </div>
    </main>
  )
}
