import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { generateSummary } from '../actions'

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default async function NewSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const today = new Date()
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
  const action = generateSummary.bind(null, pet.id)

  const inputClass =
    'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100'
  const labelClass = 'block text-xs font-medium text-stone-600 mb-1'

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-6">
      <div>
        <Link href={`/pets/${pet.id}`} className="text-sm text-stone-500 hover:text-stone-700">
          ← {pet.name}
        </Link>
        <h1 className="text-2xl font-semibold mt-2">New summary</h1>
        <p className="text-sm text-stone-500">
          Turn recent logs into a clean handoff a vet can read in under a minute.
        </p>
      </div>

      <form action={action} className="rounded-xl border border-stone-200 bg-white p-6 space-y-4">
        <div>
          <label htmlFor="kind" className={labelClass}>Kind</label>
          <select id="kind" name="kind" className={inputClass} defaultValue="vet_visit">
            <option value="vet_visit">Vet visit handoff</option>
            <option value="range">Range summary</option>
            <option value="issue">Issue report</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="range_start" className={labelClass}>From</label>
            <input
              id="range_start"
              name="range_start"
              type="date"
              defaultValue={isoDate(twoWeeksAgo)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="range_end" className={labelClass}>To</label>
            <input
              id="range_end"
              name="range_end"
              type="date"
              defaultValue={isoDate(today)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="issue_focus" className={labelClass}>Focus (optional)</label>
          <input
            id="issue_focus"
            name="issue_focus"
            type="text"
            placeholder="e.g. recurring ear scratching"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Generate
        </button>
      </form>
    </main>
  )
}
