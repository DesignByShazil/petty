import type { Pet } from '@/lib/db/types'

type Props = {
  action: (formData: FormData) => void | Promise<void>
  pet?: Pet
  submitLabel: string
}

const inputClass =
  'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100'

const labelClass = 'block text-xs font-medium text-stone-600 mb-1'

export function PetForm({ action, pet, submitLabel }: Props) {
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className={labelClass}>Name</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={pet?.name}
          className={inputClass}
          placeholder="Buddy"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="species" className={labelClass}>Species</label>
          <select id="species" name="species" defaultValue={pet?.species ?? 'dog'} className={inputClass}>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="sex" className={labelClass}>Sex</label>
          <select id="sex" name="sex" defaultValue={pet?.sex ?? 'unknown'} className={inputClass}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="breed" className={labelClass}>Breed</label>
        <input
          id="breed"
          name="breed"
          defaultValue={pet?.breed ?? ''}
          className={inputClass}
          placeholder="Labrador"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date_of_birth" className={labelClass}>Date of birth</label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            defaultValue={pet?.date_of_birth ?? ''}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="weight_kg" className={labelClass}>Weight (kg)</label>
          <input
            id="weight_kg"
            name="weight_kg"
            type="number"
            step="0.1"
            min="0"
            defaultValue={pet?.weight_kg ?? ''}
            className={inputClass}
            placeholder="12.5"
          />
        </div>
      </div>

      <div>
        <label htmlFor="vet_name" className={labelClass}>Vet name</label>
        <input
          id="vet_name"
          name="vet_name"
          defaultValue={pet?.vet_name ?? ''}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="vet_contact" className={labelClass}>Vet contact</label>
        <input
          id="vet_contact"
          name="vet_contact"
          defaultValue={pet?.vet_contact ?? ''}
          className={inputClass}
          placeholder="Phone or email"
        />
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={pet?.notes ?? ''}
          className={inputClass}
          placeholder="Anything the vet should know"
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
      >
        {submitLabel}
      </button>
    </form>
  )
}
