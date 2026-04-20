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
    <main className="mx-auto max-w-xl px-4 py-14">
      <div className="anim-fade-up">
        <Link
          href="/pets"
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--ink-soft)] transition-colors hover:text-[color:var(--ink)]"
        >
          <span aria-hidden="true">←</span> Back to pets
        </Link>

        <div className="mt-6 mb-8">
          <p className="eyebrow">New arrival</p>
          <h1 className="mt-1 font-display text-4xl leading-none text-[color:var(--ink)]">
            Add a pet
          </h1>
          <p className="mt-3 text-sm text-[color:var(--ink-soft)]">
            Start with the basics. You can add a photo and more detail once they&apos;re in.
          </p>
        </div>
      </div>

      <div className="surface p-6 anim-fade-up" style={{ animationDelay: '80ms' }}>
        <PetForm action={createPet} submitLabel="Create pet" />
      </div>
    </main>
  )
}
