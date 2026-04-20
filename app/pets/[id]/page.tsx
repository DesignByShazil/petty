import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { PetForm } from '@/components/pet-form'
import { ConditionsSection } from '@/components/conditions-section'
import { MedicationsSection } from '@/components/medications-section'
import { RecentEntries } from '@/components/recent-entries'
import { signedUrlsForPaths } from './log/[entryId]/media-actions'
import { updatePet } from '../actions'

export default async function PetOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: pet } = await supabase
    .from('pet')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!pet) notFound()

  const [{ data: conditions }, { data: medications }, { data: entries }, { data: summaries }] = await Promise.all([
    supabase.from('condition').select('*').eq('pet_id', id).order('created_at', { ascending: false }),
    supabase.from('medication').select('*').eq('pet_id', id).order('created_at', { ascending: false }),
    supabase
      .from('log_entry')
      .select('*')
      .eq('pet_id', id)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false })
      .limit(5),
    supabase
      .from('summary')
      .select('id, kind, range_start, range_end, created_at, status, model')
      .eq('pet_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const entryIds = (entries ?? []).map((e) => e.id)
  const { data: mediaRows } = entryIds.length
    ? await supabase
        .from('media')
        .select('id, log_entry_id, mime_type, storage_path')
        .in('log_entry_id', entryIds)
        .order('created_at', { ascending: true })
    : { data: [] as Array<{ id: string; log_entry_id: string; mime_type: string; storage_path: string }> }

  const urlMap = await signedUrlsForPaths((mediaRows ?? []).map((m) => m.storage_path))
  const mediaByEntry: Record<string, Array<{ id: string; mime_type: string; storage_path: string; signedUrl?: string }>> = {}
  for (const m of mediaRows ?? []) {
    if (!mediaByEntry[m.log_entry_id]) mediaByEntry[m.log_entry_id] = []
    mediaByEntry[m.log_entry_id].push({
      id: m.id,
      mime_type: m.mime_type,
      storage_path: m.storage_path,
      signedUrl: urlMap[m.storage_path],
    })
  }

  const updatePetAction = updatePet.bind(null, pet.id)

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-10">
      <div>
        <Link href="/pets" className="text-sm text-stone-500 hover:text-stone-700">
          ← All pets
        </Link>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{pet.name}</h1>
            <p className="text-sm text-stone-500">
              {pet.species}
              {pet.breed ? ` · ${pet.breed}` : ''}
            </p>
          </div>
          <Link
            href={`/pets/${pet.id}/timeline`}
            className="text-sm text-stone-600 hover:text-stone-900 underline"
          >
            Full timeline
          </Link>
        </div>
      </div>

      <RecentEntries
        petId={pet.id}
        entries={entries ?? []}
        currentUserId={user.id}
        mediaByEntry={mediaByEntry}
      />

      <section>
        <h2 className="text-sm font-medium text-stone-700 mb-3 uppercase tracking-wide">Baseline</h2>
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <PetForm action={updatePetAction} pet={pet} submitLabel="Save changes" />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-stone-700 uppercase tracking-wide">
            Summaries
          </h2>
          <Link
            href={`/pets/${pet.id}/summary/new`}
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
          >
            New summary
          </Link>
        </div>
        {summaries && summaries.length > 0 ? (
          <ul className="space-y-2">
            {summaries.map((s) => (
              <li key={s.id} className="rounded-lg border border-stone-200 bg-white px-4 py-3">
                <Link href={`/pets/${pet.id}/summary/${s.id}`} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{s.kind.replace('_', ' ')}</p>
                    <p className="text-xs text-stone-500">
                      {s.range_start ? new Date(s.range_start).toLocaleDateString() : ''}
                      {s.range_end ? ` → ${new Date(s.range_end).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-stone-400">{s.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-200 bg-white px-6 py-8 text-center">
            <p className="text-sm text-stone-500">
              No summaries yet. Generate one before your next vet visit.
            </p>
          </div>
        )}
      </section>

      <ConditionsSection petId={pet.id} conditions={conditions ?? []} />
      <MedicationsSection petId={pet.id} medications={medications ?? []} />
    </main>
  )
}
