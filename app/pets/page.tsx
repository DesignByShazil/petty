import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { ReminderRow } from '@/components/reminder-row'
import { PetsList } from '@/components/pets-list'
import { bucketFor } from '@/lib/reminders/schedule'
import { signedAvatarUrls } from './avatar-actions'

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
      .select('id, name, species, breed, avatar_url')
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

  const avatarPaths = (pets ?? []).map((p) => p.avatar_url).filter((v): v is string => !!v)
  const avatarUrlMap = await signedAvatarUrls(avatarPaths)

  const petCards = (pets ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    species: p.species,
    breed: p.breed,
    avatarUrl: p.avatar_url ? (avatarUrlMap[p.avatar_url] ?? null) : null,
  }))

  const now = new Date()
  const dueToday = ((reminders ?? []) as unknown as ReminderRowLite[]).filter((r) => {
    const b = bucketFor(new Date(r.due_at), now)
    return b === 'today' || b === 'overdue'
  })

  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <header className="mb-10 flex items-end justify-between anim-fade-up">
        <div>
          <p className="eyebrow">Your household</p>
          <h1 className="mt-1 font-display text-4xl leading-none text-[color:var(--ink)]">
            Pets
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/reminders" className="btn btn-ghost">
            Reminders
          </Link>
          <Link href="/pets/new" className="btn btn-primary">
            <span>+</span>
            <span>Add pet</span>
          </Link>
        </div>
      </header>

      {dueToday.length > 0 && (
        <section className="mb-10 anim-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="eyebrow">
              Due today
              <span className="ml-2 text-xs font-normal text-[color:var(--ink-mute)]">
                {dueToday.length}
              </span>
            </h2>
            <Link
              href="/reminders"
              className="text-xs text-[color:var(--ink-soft)] underline hover:text-[color:var(--ink)]"
            >
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

      {petCards.length === 0 ? (
        <div className="surface px-8 py-14 text-center anim-fade-up">
          <p className="font-display text-2xl text-[color:var(--ink)]">
            A quiet household.
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[color:var(--ink-soft)]">
            Add your first pet to start tracking symptoms, meals, and vet notes.
          </p>
          <Link href="/pets/new" className="btn btn-sage mt-6">
            Add your first pet
          </Link>
        </div>
      ) : (
        <PetsList pets={petCards} />
      )}
    </main>
  )
}
