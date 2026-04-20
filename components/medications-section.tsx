import type { Medication } from '@/lib/db/types'
import {
  addMedication,
  removeMedication,
  toggleMedicationActive,
} from '@/app/pets/actions'

const inputClass =
  'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100'

export function MedicationsSection({
  petId,
  medications,
}: {
  petId: string
  medications: Medication[]
}) {
  const addAction = addMedication.bind(null, petId)

  return (
    <section>
      <h2 className="text-sm font-medium text-stone-700 mb-3 uppercase tracking-wide">
        Medications
      </h2>

      {medications.length > 0 && (
        <ul className="space-y-2 mb-4">
          {medications.map((m) => {
            const remove = removeMedication.bind(null, petId, m.id)
            const toggle = toggleMedicationActive.bind(null, petId, m.id, !m.active)
            return (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sm">
                    {m.name}
                    {!m.active && (
                      <span className="ml-2 text-xs text-stone-400">(inactive)</span>
                    )}
                  </p>
                  <p className="text-xs text-stone-500">
                    {[m.dose_amount, m.schedule].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {m.prescribed_by && (
                    <p className="text-xs text-stone-500">Rx: {m.prescribed_by}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <form action={toggle}>
                    <button
                      type="submit"
                      className="text-xs text-stone-500 hover:text-stone-900"
                    >
                      {m.active ? 'Mark inactive' : 'Reactivate'}
                    </button>
                  </form>
                  <form action={remove}>
                    <button
                      type="submit"
                      className="text-xs text-stone-400 hover:text-red-600"
                      aria-label={`Remove ${m.name}`}
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <form action={addAction} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <input name="name" required placeholder="e.g. Apoquel" className={inputClass} />
        <div className="grid grid-cols-2 gap-3">
          <input name="dose_amount" placeholder="5.4 mg" className={inputClass} />
          <input name="schedule" placeholder="twice daily" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input name="start_date" type="date" className={inputClass} />
          <input name="prescribed_by" placeholder="Dr. Patel" className={inputClass} />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Add medication
        </button>
      </form>
    </section>
  )
}
