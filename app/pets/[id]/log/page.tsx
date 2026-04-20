import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { LogEntryForm } from '@/components/log-entry-form'
import { createLogEntry } from './actions'

export default async function NewLogEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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

  const action = createLogEntry.bind(null, pet.id)

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href={`/pets/${pet.id}`} className="text-sm text-stone-500 hover:text-stone-700">
        ← Back to {pet.name}
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">Log an entry</h1>

      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <LogEntryForm action={action} submitLabel="Save entry" />
      </div>
    </main>
  )
}
