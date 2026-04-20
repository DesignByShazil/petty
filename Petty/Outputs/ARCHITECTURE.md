# Architecture — Petty

## Pack Type
Web SaaS

## Stack
- **Frontend:** Next.js 16 (App Router) + Tailwind CSS v4 + React 19
- **Backend:** Supabase — Postgres, Auth, Storage, Edge Functions
- **Auth:** Supabase Auth (email + magic link for MVP)
- **Hosting:** Vercel
- **AI:** Claude Haiku 4.5 default, Sonnet 4.6 escalator for complex summaries — behind a provider-agnostic interface with a stub for local dev (see §AI Interface)
- **PDF:** `@react-pdf/renderer` server-side in an Edge Function

## System Overview
Petty is a logging and summarisation tool for pet owners. Owners log symptoms, behaviors, meds, and media across the day. The app builds a timeline. When a vet visit approaches, they tap a button and get a clean, clinically-ordered summary they can print, email, or show on screen.

The loop: **notice → log → organise → summarise → hand off → follow up**.

## Core Modules
1. **Pet profile** — baseline info, conditions, meds
2. **Logging** — quick entry UI for symptoms, behaviors, meals, stool, activity
3. **Media capture** — photo/video attached to a log entry, stored in Supabase Storage
4. **Timeline** — chronological and grouped-by-tag views; pattern highlights
5. **Summary** — AI-generated vet handoff, exportable as PDF
6. **Reminders** — meds and follow-ups, surfaced on the home screen

## Data Flow

```
Owner (web) ──► Next.js route handler
                    │
                    ├── Supabase Postgres (log entries, pets, reminders)
                    ├── Supabase Storage  (photos, videos, generated PDFs)
                    └── Edge Function: ai-summary
                             │
                             └── AI provider (stubbed) ──► markdown summary
                                                    │
                                                    └── PDF render ──► Storage
```

All reads and writes from the browser go through Supabase's client library with RLS; there is no custom backend server.

## Key Decisions

| Decision | Chosen | Rejected | Reason |
|---|---|---|---|
| Database | Supabase (Postgres) | Firebase | Relational data, RLS, SQL queries for timeline |
| Auth | Supabase Auth | Auth0 / Clerk | Bundled, cheaper for MVP |
| Hosting | Vercel | AWS / Render | Next.js DX, previews per PR |
| Media storage | Supabase Storage | S3 direct | Same auth context as DB; signed URLs are easy |
| Sharing unit | `Household` | `Workspace` | Consumer app, not B2B; multi-caretaker is the real need |
| AI provider | Claude Haiku 4.5 + Sonnet 4.6 escalator | GPT-5-mini, Gemini 2.5 Flash, stub-only | Best tone adherence for the voice rules, cheap at ~$0.005/summary, vision available for future photo work, single vendor |
| PDF rendering | `@react-pdf/renderer` in Edge Fn | Headless Chrome | Lighter, no container |
| State | Server components + React Query for mutations | Global store (Zustand/Redux) | App is mostly read-from-DB; cache per pet |

## AI Interface

The summary feature is behind a thin port in `/lib/ai/summary.ts` so the vendor is a config decision, not an architectural one.

```ts
export type SummaryInput = {
  pet: Pet;
  conditions: Condition[];
  medications: Medication[];
  entries: LogEntry[];       // filtered by range
  range: { start: Date; end: Date };
  kind: 'vet_visit' | 'range' | 'issue_report';
};

export type SummaryOutput = {
  markdown: string;          // the handoff
  model: string;             // id we record to Summary.model
  promptVersion: string;     // e.g. "v1"
  usage: {                   // token accounting for COST_DASHBOARD
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  };
};

export interface SummaryProvider {
  generate(input: SummaryInput): Promise<SummaryOutput>;
}
```

### Implementations
- **`ClaudeSummaryProvider`** — default in production. Internally branches:
  - `entries.length > 100 || conditions.filter(c => c.status === 'active').length > 3` → **Sonnet 4.6**
  - otherwise → **Haiku 4.5**
- **`StubSummaryProvider`** — deterministic string templates. Ships alongside the Claude provider for:
  - Local dev without an API key
  - Offline tests
  - A hard fallback if the Anthropic API is down (caught and swapped)

Selection via env var `SUMMARY_PROVIDER` (`claude` | `stub`). Default in production is `claude`.

### Prompt Caching
The Anthropic API supports prompt caching (cache_control breakpoints). We exploit it by structuring every call as:

```
[SYSTEM PROMPT]  ────────────────────── cached (rarely changes)
[PET PROFILE + CONDITIONS + MEDS]  ──── cached (per-pet; key includes pet.updated_at)
──── cache breakpoint ────
[LOG ENTRIES + RANGE + KIND]  ──────── dynamic
[USER MESSAGE: "Generate summary"]
```

Expected savings: ~70% on input tokens for the second and subsequent summaries against the same pet within the cache TTL.

### Prompt Versioning
Prompt files live in `/lib/ai/prompts/v1/` as markdown (system.md, pet-context.md, task.md). Every `summary` row stores the `prompt_version` used so regeneration is deterministic and changes are traceable. Bump to `v2/` when you want to A/B test.

### Observability
Every call logs `{ provider, model, inputTokens, outputTokens, cachedInputTokens, durationMs, petId, kind }` to a `summary_call_log` table (out-of-scope table for MVP — add with first real provider call).

## Media Pipeline

1. Client requests a signed upload URL from a server action.
2. Client uploads directly to Supabase Storage bucket `pet-media` (private).
3. Server creates the `media` row with `storage_path`, mime, size.
4. Timeline reads produce signed URLs on the fly (short TTL, e.g. 10 min).
5. Video: no transcoding for MVP — we trust the browser to play what it uploaded.

## Repo Structure
```
/app              Next.js App Router routes
  /(marketing)    Landing, pricing (future)
  /(app)          Authed area: pets, logs, timeline, summary
/components       UI components (small and reusable)
/hooks            Custom React hooks
/lib              Shared utilities
  /ai             Provider-agnostic summary interface + stub
  /db             Supabase client factories, typed queries
  /pdf            PDF templates
/migrations       SQL migrations (Supabase)
/tests            Unit + integration tests
```

## Out of Scope for MVP
- Wearable / smart collar ingest
- Live telehealth or in-app vet consultations
- In-app store and product recommendations
- Vet-facing portal
- Mobile native apps (PWA only if anything)

## Risks

| Risk | Mitigation |
|---|---|
| Auth edge cases (magic link, stale sessions) | Test thoroughly; lean on Supabase defaults, don't customize flows in MVP |
| Schema churn mid-build | Schema frozen at Task 1 kickoff; changes go through a dated addendum |
| AI cost blow-up post-decision | Provider stub in MVP; track cost per summary once real model is live |
| Large video uploads | Enforce 100 MB per file limit client-side; compress on device where possible |
| PII in photos | Private bucket, signed URLs only; no public sharing in MVP |

## Created
2026-04-16
## Updated
2026-04-17 — added Storage, Household, provider-agnostic AI interface, repo detail, risks
