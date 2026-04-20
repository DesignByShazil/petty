import type { Condition } from '@/lib/db/types'
import { addCondition, removeCondition } from '@/app/pets/actions'

const inputClass =
  'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100'

export function ConditionsSection({
  petId,
  conditions,
}: {
  petId: string
  conditions: Condition[]
}) {
  const addAction = addCondition.bind(null, petId)

  return (
    <section>
      <h2 className="text-sm font-medium text-stone-700 mb-3 uppercase tracking-wide">Conditions</h2>

      {conditions.length > 0 && (
        <ul className="space-y-2 mb-4">
          {conditions.map((c) => {
            const remove = removeCondition.bind(null, petId, c.id)
            return (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sm">{c.label}</p>
                  <p className="text-xs text-stone-500">
                    {c.status}
                    {c.started_on ? ` · since ${c.started_on}` : ''}
                  </p>
                  {c.notes && <p className="text-xs text-stone-500 mt-1">{c.notes}</p>}
                </div>
                <form action={remove}>
                  <button
                    type="submit"
                    className="text-xs text-stone-400 hover:text-red-600"
                    aria-label={`Remove ${c.label}`}
                  >
                    Remove
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      )}

      <form action={addAction} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            name="label"
            required
            placeholder="e.g. atopic dermatitis"
            className={inputClass}
          />
          <select name="status" defaultValue="active" className={inputClass}>
            <option value="active">Active</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <input name="started_on" type="date" className={inputClass} />
        <input name="notes" placeholder="Notes (optional)" className={inputClass} />
        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Add condition
        </button>
      </form>
    </section>
  )
}
