'use client'

import { useFormStatus } from 'react-dom'
import type { Pet } from '@/lib/db/types'

type Props = {
  action: (formData: FormData) => void | Promise<void>
  pet?: Pet
  submitLabel: string
}

function SubmitButton({ submitLabel }: { submitLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="btn btn-primary"
    >
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span>Saving…</span>
        </>
      ) : (
        submitLabel
      )}
    </button>
  )
}

export function PetForm({ action, pet, submitLabel }: Props) {
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="name" className="label">Name</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={pet?.name}
          className="input"
          placeholder="Buddy"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="species" className="label">Species</label>
          <select id="species" name="species" defaultValue={pet?.species ?? 'dog'} className="input">
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="sex" className="label">Sex</label>
          <select id="sex" name="sex" defaultValue={pet?.sex ?? 'unknown'} className="input">
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="breed" className="label">Breed</label>
        <input
          id="breed"
          name="breed"
          defaultValue={pet?.breed ?? ''}
          className="input"
          placeholder="Labrador"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date_of_birth" className="label">Date of birth</label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            defaultValue={pet?.date_of_birth ?? ''}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="weight_kg" className="label">Weight (kg)</label>
          <input
            id="weight_kg"
            name="weight_kg"
            type="number"
            step="0.1"
            min="0"
            defaultValue={pet?.weight_kg ?? ''}
            className="input"
            placeholder="12.5"
          />
        </div>
      </div>

      <div>
        <label htmlFor="vet_name" className="label">Vet name</label>
        <input
          id="vet_name"
          name="vet_name"
          defaultValue={pet?.vet_name ?? ''}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="vet_contact" className="label">Vet contact</label>
        <input
          id="vet_contact"
          name="vet_contact"
          defaultValue={pet?.vet_contact ?? ''}
          className="input"
          placeholder="Phone or email"
        />
      </div>

      <div>
        <label htmlFor="notes" className="label">Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={pet?.notes ?? ''}
          className="input"
          placeholder="Anything the vet should know"
        />
      </div>

      <div className="pt-1">
        <SubmitButton submitLabel={submitLabel} />
      </div>
    </form>
  )
}
