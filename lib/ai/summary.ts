import type { Condition, LogEntry, Medication, Pet, SummaryKind } from '@/lib/db/types'

export const PROMPT_VERSION = 'v1'
export const MAX_OUTPUT_TOKENS = 1200
export const ESCALATION_ENTRY_THRESHOLD = 100
export const ESCALATION_CONDITION_THRESHOLD = 3
export const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
export const SONNET_MODEL = 'claude-sonnet-4-6'

export type SummaryInput = {
  pet: Pick<
    Pet,
    | 'id'
    | 'name'
    | 'species'
    | 'breed'
    | 'sex'
    | 'date_of_birth'
    | 'weight_kg'
    | 'vet_name'
    | 'vet_contact'
    | 'notes'
    | 'updated_at'
  >
  conditions: Pick<Condition, 'label' | 'status' | 'started_on' | 'notes'>[]
  medications: Pick<Medication, 'name' | 'dose_amount' | 'schedule' | 'active'>[]
  entries: Pick<
    LogEntry,
    'id' | 'kind' | 'severity' | 'occurred_at' | 'tags' | 'body' | 'structured'
  >[]
  kind: SummaryKind
  rangeStart: string
  rangeEnd: string
  issueFocus?: string
}

export type SummaryUsage = {
  inputTokens?: number
  outputTokens?: number
  cacheReadInputTokens?: number
  cacheCreationInputTokens?: number
}

export type SummaryResult = {
  markdown: string
  model: string
  promptVersion: string
  inputEntryIds: string[]
  usage: SummaryUsage
  status: 'draft' | 'final'
}

export interface SummaryProvider {
  generate(input: SummaryInput): Promise<SummaryResult>
}

/**
 * Escalate to a larger model when the input is big enough to justify it.
 * Keeps small generations on Haiku to save cost + latency.
 */
export function shouldEscalate(input: SummaryInput): boolean {
  const activeConditions = input.conditions.filter((c) => c.status === 'active').length
  return (
    input.entries.length > ESCALATION_ENTRY_THRESHOLD ||
    activeConditions > ESCALATION_CONDITION_THRESHOLD
  )
}

export function modelFor(input: SummaryInput): string {
  return shouldEscalate(input) ? SONNET_MODEL : HAIKU_MODEL
}

export function kindTitle(kind: SummaryKind): string {
  switch (kind) {
    case 'vet_visit': return 'Vet visit handoff'
    case 'range': return 'Range summary'
    case 'issue': return 'Issue report'
  }
}
