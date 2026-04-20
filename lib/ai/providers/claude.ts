import fs from 'node:fs'
import path from 'node:path'
import {
  MAX_OUTPUT_TOKENS,
  PROMPT_VERSION,
  kindTitle,
  modelFor,
  type SummaryInput,
  type SummaryProvider,
  type SummaryResult,
  type SummaryUsage,
} from '@/lib/ai/summary'
import { StubSummaryProvider } from '@/lib/ai/providers/stub'

const PROMPT_DIR = path.join(process.cwd(), 'lib', 'ai', 'prompts', PROMPT_VERSION)

function loadPrompt(name: string): string {
  return fs.readFileSync(path.join(PROMPT_DIR, `${name}.md`), 'utf8')
}

function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

function formatConditions(conds: SummaryInput['conditions']): string {
  if (conds.length === 0) return '_None on record._'
  return conds
    .map((c) => `- ${c.label} (${c.status})${c.notes ? ` — ${c.notes}` : ''}`)
    .join('\n')
}

function formatMedications(meds: SummaryInput['medications']): string {
  if (meds.length === 0) return '_None on record._'
  return meds
    .map((m) => {
      const bits = [m.name, m.dose_amount, m.schedule].filter(Boolean).join(' · ')
      return `- ${bits}${m.active ? '' : ' (inactive)'}`
    })
    .join('\n')
}

function formatEntries(entries: SummaryInput['entries']): string {
  if (entries.length === 0) return '_No entries in this range._'
  return entries
    .map((e) => {
      const parts: string[] = []
      parts.push(`[${e.occurred_at}] ${e.kind}`)
      if (e.severity != null) parts.push(`severity ${e.severity}/5`)
      if (e.tags.length) parts.push(`tags: ${e.tags.join(', ')}`)
      if (e.body) parts.push(`note: ${e.body}`)
      const s = e.structured as Record<string, unknown>
      const structBits = Object.entries(s)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${v}`)
      if (structBits.length) parts.push(`fields: ${structBits.join(', ')}`)
      return `- ${parts.join(' · ')}`
    })
    .join('\n')
}

function buildPetContext(input: SummaryInput): string {
  const template = loadPrompt('pet-context')
  return render(template, {
    name: input.pet.name,
    species: input.pet.species,
    breed: input.pet.breed ?? 'unknown',
    sex: input.pet.sex,
    date_of_birth: input.pet.date_of_birth ?? 'unknown',
    weight_kg: input.pet.weight_kg != null ? String(input.pet.weight_kg) : 'unknown',
    vet_name: input.pet.vet_name ?? 'unknown',
    vet_contact: input.pet.vet_contact ?? 'unknown',
    notes: input.pet.notes ?? '_No owner notes._',
    conditions: formatConditions(input.conditions),
    medications: formatMedications(input.medications),
  })
}

function buildTask(input: SummaryInput): string {
  const template = loadPrompt('task')
  return render(template, {
    kind: input.kind,
    kind_title: kindTitle(input.kind),
    pet_name: input.pet.name,
    range_start: input.rangeStart,
    range_end: input.rangeEnd,
    generated_at: new Date().toISOString(),
    entry_count: String(input.entries.length),
    entries: formatEntries(input.entries),
    issue_focus_block: input.issueFocus ? `Focus: ${input.issueFocus}` : '',
  })
}

type AnthropicContentBlock = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }
type AnthropicMessage = { role: 'user' | 'assistant'; content: AnthropicContentBlock[] }
type AnthropicRequest = {
  model: string
  max_tokens: number
  system: AnthropicContentBlock[]
  messages: AnthropicMessage[]
}
type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
}

export class ClaudeSummaryProvider implements SummaryProvider {
  constructor(
    private apiKey: string,
    private fetchImpl: typeof fetch = fetch
  ) {}

  async generate(input: SummaryInput): Promise<SummaryResult> {
    const model = modelFor(input)
    const system = loadPrompt('system')
    const petContext = buildPetContext(input)
    const task = buildTask(input)

    const body: AnthropicRequest = {
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [{ type: 'text', text: system }],
      messages: [
        {
          role: 'user',
          content: [
            // Pet context is the stable block — mark it cacheable. Cache key is
            // influenced by the pet.updated_at embedded in the block.
            {
              type: 'text',
              text: `<!-- pet_updated_at:${input.pet.updated_at} -->\n${petContext}`,
              cache_control: { type: 'ephemeral' },
            },
            { type: 'text', text: task },
          ],
        },
      ],
    }

    try {
      const res = await this.fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Anthropic API ${res.status}: ${text}`)
      }

      const json = (await res.json()) as AnthropicResponse
      const markdown = (json.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('\n')
        .trim()

      if (!markdown) {
        throw new Error('Anthropic returned empty content')
      }

      const usage: SummaryUsage = {
        inputTokens: json.usage?.input_tokens,
        outputTokens: json.usage?.output_tokens,
        cacheReadInputTokens: json.usage?.cache_read_input_tokens,
        cacheCreationInputTokens: json.usage?.cache_creation_input_tokens,
      }

      return {
        markdown,
        model,
        promptVersion: PROMPT_VERSION,
        inputEntryIds: input.entries.map((e) => e.id),
        usage,
        status: 'final',
      }
    } catch (err) {
      console.error('[ClaudeSummaryProvider] falling back to stub:', err)
      const stub = await new StubSummaryProvider().generate(input)
      return { ...stub, status: 'draft' }
    }
  }
}

/**
 * Resolve the configured provider from env. Defaults to the stub if no key is set.
 */
export function resolveProvider(): SummaryProvider {
  const which = process.env.SUMMARY_PROVIDER ?? 'stub'
  if (which === 'claude') {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) {
      console.warn('[resolveProvider] SUMMARY_PROVIDER=claude but ANTHROPIC_API_KEY is unset; using stub')
      return new StubSummaryProvider()
    }
    return new ClaudeSummaryProvider(key)
  }
  return new StubSummaryProvider()
}
