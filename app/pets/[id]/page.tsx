import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { PetForm } from '@/components/pet-form'
import { PetAvatarUploader } from '@/components/pet-avatar-uploader'
import { ConditionsSection } from '@/components/conditions-section'
import { MedicationsSection } from '@/components/medications-section'
import { RecentEntries } from '@/components/recent-entries'
import { signedUrlsForPaths } from './log/[entryId]/media-actions'
import { signedAvatarUrls } from '../avatar-actions'
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

  const [
    { data: conditions },
    { data: medications },
    { data: entries },
    { data: summaries },
    avatarUrlMap,
  ] = await Promise.all([
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
    pet.avatar_url ? signedAvatarUrls([pet.avatar_url]) : Promise.resolve({} as Record<string, string>),
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

  const avatarSignedUrl = pet.avatar_url ? (avatarUrlMap[pet.avatar_url] ?? null) : null
  const updatePetAction = updatePet.bind(null, pet.id)

  return (
    <main className="mx-auto max-w-3xl px-4 py-14 space-y-12">
      <div className="anim-fade-up">
        <Link
          href="/pets"
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--ink-soft)] transition-colors hover:text-[color:var(--ink)]"
        >
          <span aria-hidden="true">←</span> All pets
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
            <h1 className="mt-1 font-display text-5xl leading-none text-[color:var(--ink)]">
              {pet.name}
            </h1>
            {pet.weight_kg && (
              <p className="mt-3 text-sm text-[color:var(--ink-soft)]">
                {pet.weight_kg} kg
                {pet.date_of_birth ? ` · born ${new Date(pet.date_of_birth).toLocaleDateString()}` : ''}
              </p>
            )}
          </div>
          <Link
            href={`/pets/${pet.id}/timeline`}
            className="btn btn-ghost"
          >
            Full timeline →
          </Link>
        </div>
      </div>

      <section className="surface p-6 anim-fade-up" style={{ animationDelay: '60ms' }}>
        <PetAvatarUploader
          petId={pet.id}
          petName={pet.name}
          initialSrc={avatarSignedUrl}
          hasAvatar={!!pet.avatar_url}
        />
      </section>

      <div className="anim-fade-up" style={{ animationDelay: '120ms' }}>
        <RecentEntries
          petId={pet.id}
          entries={entries ?? []}
          currentUserId={user.id}
          mediaByEntry={mediaByEntry}
        />
      </div>

      <section className="anim-fade-up" style={{ animationDelay: '180ms' }}>
        <h2 className="eyebrow mb-3">Baseline</h2>
        <div className="surface p-6">
          <PetForm action={updatePetAction} pet={pet} submitLabel="Save changes" />
        </div>
      </section>

      <section className="anim-fade-up" style={{ animationDelay: '240ms' }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">Summaries</h2>
          <Link
            href={`/pets/${pet.id}/summary/new`}
            className="btn btn-sage"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
          >
            + New summary
          </Link>
        </div>
        {summaries && summaries.length > 0 ? (
          <ul className="space-y-2">
            {summaries.map((s) => (
              <li key={s.id} className="surface surface-hover">
                <Link href={`/pets/${pet.id}/summary/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[color:var(--ink)]">
                      {s.kind.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-[color:var(--ink-soft)]">
                      {s.range_start ? new Date(s.range_start).toLocaleDateString() : ''}
                      {s.range_end ? ` → ${new Date(s.range_end).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <span className="chip">{s.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="surface border-dashed px-6 py-10 text-center">
            <p className="font-display text-lg text-[color:var(--ink)]">
              No summaries yet
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[color:var(--ink-soft)]">
              Generate one before your next vet visit.
            </p>
          </div>
        )}
      </section>

      <div className="anim-fade-up" style={{ animationDelay: '300ms' }}>
        <ConditionsSection petId={pet.id} conditions={conditions ?? []} />
      </div>
      <div className="anim-fade-up" style={{ animationDelay: '360ms' }}>
        <MedicationsSection petId={pet.id} medications={medications ?? []} />
      </div>
    </main>
  )
}
