import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { ReminderRow } from '@/components/reminder-row'
import { bucketFor, type ReminderBucket } from '@/lib/reminders/schedule'

type Row = {
  id: string
  pet_id: string
  medication_id: string | null
  kind: 'medication' | 'vet_followup' | 'custom'
  title: string
  due_at: string
  status: 'pending' | 'done' | 'skipped'
  pet: { id: string; name: string } | null
}

const BUCKET_LABELS: Record<ReminderBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  this_week: 'This week',
  later: 'Later',
}

const BUCKET_ORDER: ReminderBucket[] = ['overdue', 'today', 'this_week', 'later']

export default async function RemindersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data } = await supabase
    .from('reminder')
    .select('id, pet_id, medication_id, kind, title, due_at, status, pet:pet_id(id, name)')
    .eq('status', 'pending')
    .order('due_at', { ascending: true })
    .limit(200)

  const reminders = (data ?? []) as unknown as Row[]
  const now = new Date()

  const buckets: Record<ReminderBucket, Row[]> = {
    overdue: [], today: [], this_week: [], later: [],
  }
  for (const r of reminders) {
    buckets[bucketFor(new Date(r.due_at), now)].push(r)
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      <div>
        <Link href="/pets" className="text-sm text-stone-500 hover:text-stone-700">
          ← All pets
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Reminders</h1>
        <p className="text-sm text-stone-500">
          Medication doses and vet follow-ups due in the next week.
        </p>
      </div>

      {reminders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-stone-500">
            No reminders pending. Add a medication or follow-up to see them here.
          </p>
        </div>
      ) : (
        BUCKET_ORDER.map((key) => {
          const items = buckets[key]
          if (items.length === 0) return null
          return (
            <section key={key}>
              <h2 className="text-sm font-medium text-stone-700 mb-3 uppercase tracking-wide">
                {BUCKET_LABELS[key]}
                <span className="ml-2 text-xs font-normal text-stone-400">{items.length}</span>
              </h2>
              <ul className="space-y-2">
                {items.map((r) => (
                  <ReminderRow
                    key={r.id}
                    reminder={r}
                    petName={r.pet?.name}
                  />
                ))}
              </ul>
            </section>
          )
        })
      )}
    </main>
  )
}
