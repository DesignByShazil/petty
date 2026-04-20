import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { LogEntryForm } from '@/components/log-entry-form'
import { MediaSection } from '@/components/media-section'
import { updateLogEntry } from '../actions'
import { signedUrlsForPaths } from './media-actions'

export default async function EditLogEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>
}) {
  const { id, entryId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: entry } = await supabase
    .from('log_entry')
    .select('*')
    .eq('id', entryId)
    .eq('pet_id', id)
    .is('deleted_at', null)
    .single()

  if (!entry) notFound()

  const { data: mediaRows } = await supabase
    .from('media')
    .select('id, mime_type, storage_path')
    .eq('log_entry_id', entryId)
    .order('created_at', { ascending: true })

  const signedUrls = await signedUrlsForPaths(
    (mediaRows ?? []).map((m) => m.storage_path)
  )
  const mediaItems = (mediaRows ?? []).map((m) => ({
    ...m,
    signedUrl: signedUrls[m.storage_path],
  }))

  const action = updateLogEntry.bind(null, id, entryId)

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-10">
      <div>
        <Link href={`/pets/${id}`} className="text-sm text-stone-500 hover:text-stone-700">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Edit entry</h1>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <LogEntryForm action={action} entry={entry} submitLabel="Save changes" />
      </div>

      <MediaSection petId={id} entryId={entryId} existing={mediaItems} />
    </main>
  )
}
