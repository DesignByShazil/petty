import {
  PROMPT_VERSION,
  kindTitle,
  modelFor,
  type SummaryInput,
  type SummaryProvider,
  type SummaryResult,
} from '@/lib/ai/summary'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return 'unknown'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function countTagDays(entries: SummaryInput['entries']): Array<{ tag: string; days: number }> {
  const perTag = new Map<string, Set<string>>()
  for (const e of entries) {
    const day = e.occurred_at.slice(0, 10)
    for (const t of e.tags ?? []) {
      if (!perTag.has(t)) perTag.set(t, new Set())
      perTag.get(t)!.add(day)
    }
  }
  return Array.from(perTag.entries())
    .map(([tag, days]) => ({ tag, days: days.size }))
    .sort((a, b) => b.days - a.days)
}

function countKind(entries: SummaryInput['entries'], kind: string): number {
  return entries.filter((e) => e.kind === kind).length
}

/**
 * Deterministic, no-network summary provider. Used when `SUMMARY_PROVIDER=stub`
 * or as a fallback when the Anthropic API errors.
 */
export class StubSummaryProvider implements SummaryProvider {
  async generate(input: SummaryInput): Promise<SummaryResult> {
    const { pet, entries, conditions, medications, kind, rangeStart, rangeEnd, issueFocus } = input
    const title = kindTitle(kind)
    const tagDays = countTagDays(entries)
    const topTags = tagDays.slice(0, 5)

    const lines: string[] = []
    lines.push(`# ${pet.name} — ${title}`)
    lines.push(`_Generated ${new Date().toISOString()} · Range ${fmtDate(rangeStart)} → ${fmtDate(rangeEnd)}_`)
    lines.push('')
    lines.push('## Headline')
    if (entries.length === 0) {
      lines.push(`No entries logged for ${pet.name} in this range.`)
    } else {
      const top = topTags[0]
      if (top) {
        lines.push(`${entries.length} entries logged. Most frequent theme: **${top.tag}** on ${top.days} day(s).`)
      } else {
        lines.push(`${entries.length} entries logged across the range.`)
      }
    }

    if (issueFocus) {
      lines.push('')
      lines.push('## Owner focus')
      lines.push(issueFocus)
    }

    lines.push('')
    lines.push('## Key observations')
    if (topTags.length === 0) {
      lines.push('- No tagged patterns in this range.')
    } else {
      for (const t of topTags) {
        lines.push(`- **${t.tag}** — logged on ${t.days} day(s).`)
      }
    }

    lines.push('')
    lines.push('## Frequency')
    lines.push(`- Symptoms: ${countKind(entries, 'symptom')}`)
    lines.push(`- Meals: ${countKind(entries, 'meal')}`)
    lines.push(`- Stool: ${countKind(entries, 'stool')}`)
    lines.push(`- Behavior: ${countKind(entries, 'behavior')}`)
    lines.push(`- Activity: ${countKind(entries, 'activity')}`)
    lines.push(`- Incidents: ${countKind(entries, 'incident')}`)

    lines.push('')
    lines.push('## Meds and treatments')
    if (medications.length === 0) {
      lines.push('- None on record.')
    } else {
      for (const m of medications) {
        const parts = [m.name, m.dose_amount, m.schedule].filter(Boolean)
        lines.push(`- ${parts.join(' · ')}${m.active ? '' : ' _(inactive)_'}`)
      }
    }

    lines.push('')
    lines.push('## Active conditions')
    const active = conditions.filter((c) => c.status === 'active')
    if (active.length === 0) {
      lines.push('- None on record.')
    } else {
      for (const c of active) {
        lines.push(`- ${c.label}${c.started_on ? ` (since ${fmtDate(c.started_on)})` : ''}`)
      }
    }

    if (pet.notes) {
      lines.push('')
      lines.push('## Owner notes')
      lines.push(pet.notes)
    }

    return {
      markdown: lines.join('\n'),
      model: `${modelFor(input)}-stub`,
      promptVersion: PROMPT_VERSION,
      inputEntryIds: entries.map((e) => e.id),
      usage: {},
      status: 'final',
    }
  }
}
