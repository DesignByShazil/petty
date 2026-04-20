import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { ReminderRow } from '@/components/reminder-row'
import { bucketFor } from '@/lib/reminders/schedule'

type ReminderRowLite = {
  id: string
  pet_id: string
  medication_id: string | null
  kind: 'medication' | 'vet_followup' | 'custom'
  title: string
  due_at: string
  status: 'pending' | 'done' | 'skipped'
  pet: { id: string; name: string } | null
}

export default async function PetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  const [{ data: pets }, { data: reminders }] = await Promise.all([
    supabase
      .from('pet')
      .select('id, name, species, breed')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('reminder')
      .select('id, pet_id, medication_id, kind, title, due_at, status, pet:pet_id(id, name)')
      .eq('status', 'pending')
      .lte('due_at', endOfToday.toISOString())
      .order('due_at', { ascending: true })
      .limit(20),
  ])

  const now = new Date()
  const dueToday = ((reminders ?? []) as unknown as ReminderRowLite[]).filter((r) => {
    const b = bucketFor(new Date(r.due_at), now)
    return b === 'today' || b === 'overdue'
  })

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      {dueToday.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-stone-700 uppercase tracking-wide">
              Due today
              <span className="ml-2 text-xs font-normal text-stone-400">{dueToday.length}</span>
            </h2>
            <Link href="/reminders" className="text-xs text-stone-500 underline hover:text-stone-900">
              All reminders
            </Link>
          </div>
          <ul className="space-y-2">
            {dueToday.map((r) => (
              <ReminderRow key={r.id} reminder={r} petName={r.pet?.name} />
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Your pets</h1>
        <div className="flex items-center gap-3">
          <Link href="/reminders" className="text-sm text-stone-600 hover:text-stone-900 underline">
            Reminders
          </Link>
          <Link
            href="/pets/new"
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Add pet
          </Link>
        </div>
      </div>

      {!pets || pets.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white px-6 py-10 text-center">
          <p className="text-stone-500 text-sm mb-4">No pets yet. Create your first one.</p>
          <Link
            href="/pets/new"
            className="inline-block rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Add your first pet
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {pets.map((p) => (
            <li key={p.id}>
              <Link
                href={`/pets/${p.id}`}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-stone-300"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-stone-500">
                    {p.species}
                    {p.breed ? ` · ${p.breed}` : ''}
                  </p>
                </div>
                <span className="text-stone-400 text-sm">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
