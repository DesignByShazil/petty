import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/db/server'
import { createPet } from '../actions'
import { PetForm } from '@/components/pet-form'

export default async function NewPetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/pets" className="text-sm text-stone-500 hover:text-stone-700">
        ← Back to pets
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">Add a pet</h1>

      <PetForm action={createPet} submitLabel="Create pet" />
    </main>
  )
}
