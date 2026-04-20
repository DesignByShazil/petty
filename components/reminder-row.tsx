import Link from 'next/link'
import { resolveReminder, deleteReminder } from '@/app/reminders/actions'
import type { Reminder } from '@/lib/db/types'

export function ReminderRow({
  reminder,
  petName,
}: {
  reminder: Pick<Reminder, 'id' | 'pet_id' | 'medication_id' | 'kind' | 'title' | 'due_at' | 'status'>
  petName?: string
}) {
  const due = new Date(reminder.due_at)
  const dueLabel = due.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const isMedication = reminder.kind === 'medication'
  const given = resolveReminder.bind(null, reminder.id, 'given')
  const missed = resolveReminder.bind(null, reminder.id, 'missed')
  const refused = resolveReminder.bind(null, reminder.id, 'refused')
  const remove = deleteReminder.bind(null, reminder.id)

  return (
    <li className="rounded-lg border border-stone-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-800">{reminder.title}</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {dueLabel}
            {petName ? (
              <>
                {' · '}
                <Link href={`/pets/${reminder.pet_id}`} className="underline hover:text-stone-700">
                  {petName}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isMedication ? (
            <>
              <form action={given}>
                <button className="rounded-md bg-stone-900 px-3 py-1 font-medium text-white hover:bg-stone-700">
                  Given
                </button>
              </form>
              <form action={missed}>
                <button className="rounded-md border border-stone-200 bg-white px-3 py-1 text-stone-700 hover:bg-stone-100">
                  Missed
                </button>
              </form>
              <form action={refused}>
                <button className="rounded-md border border-stone-200 bg-white px-3 py-1 text-stone-700 hover:bg-stone-100">
                  Refused
                </button>
              </form>
            </>
          ) : (
            <form action={given}>
              <button className="rounded-md bg-stone-900 px-3 py-1 font-medium text-white hover:bg-stone-700">
                Mark done
              </button>
            </form>
          )}
          <form action={remove}>
            <button className="text-stone-400 hover:text-red-600" aria-label="Delete reminder">
              ×
            </button>
          </form>
        </div>
      </div>
    </li>
  )
}
