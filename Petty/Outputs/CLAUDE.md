# CLAUDE.md — Petty

This file instructs Claude Code when building this repo. Read it first every session.

## Mission
Help pet owners arrive at the vet with a clear, organised, trustworthy picture of what has been happening.

## Target User (short)
Dog and cat owners managing a recurring issue — starting with dogs with recurring skin, stomach, anxiety, or recovery concerns. See `SYSTEM_CHARTER.md` for the full picture.

## Pack Type
Web SaaS

## Stack
- Frontend: Next.js 14 (App Router) + Tailwind CSS
- Backend: Supabase (Postgres, Auth, Storage, Edge Functions)
- Auth: Supabase Auth (email + magic link)
- Hosting: Vercel
- AI: Claude Haiku 4.5 (default) with Sonnet 4.6 escalator, behind a `SummaryProvider` interface; stub kept for local dev (see `ARCHITECTURE.md §AI Interface`)

## Repo Structure
```
/app           main application (Next.js App Router)
/components    reusable UI components
/hooks         custom React hooks
/lib           shared utilities
  /ai          summary provider interface + stub
  /db          Supabase client factories, typed queries
  /pdf         PDF templates
/migrations    database migrations
/tests         unit + integration tests
```

## Build Rules
- MVP only — no features outside `TASK_BOARD.md`
- Keep components small and reusable
- No duplicated logic — extract to `/lib`
- Write tests for all core flows (logging, summary generation, auth gate)
- Reference `SCHEMA.md` before touching the database
- Honor `VOICE_RULES.md` for every piece of user-facing copy
- Run `/cost` after each session and append to `COST_DASHBOARD.md`
- One task `in_progress` at a time

## Core User Flow
1. **Sign up** — email + magic link
2. **Add pet** — name, species, breed, sex, DOB, conditions, meds
3. **Start logging** — symptoms, behaviors, meals, stool, activity, media
4. **Timeline builds automatically** — sorted by `occurred_at`, grouped by tag
5. **Trigger summary** — "Prepare for vet visit" / "Summarise last 7 days" / "Generate issue report"
6. **AI generates vet handoff** — symptoms, dates, frequency, evidence, notable changes, actions taken
7. **Export or share** — PDF download or email
8. **Continue follow-up** — log meds, treatment plan, recovery

Loop: **notice → log → organise → summarise → hand off → follow up**.

## Out of Scope
- Wearable or smart collar integration
- Live telehealth or in-app vet consultations
- In-app store / affiliate recommendations

## Definition of Done (per feature)
- [ ] Feature works end-to-end in the happy path
- [ ] Edge cases handled (empty state, error state, long input, upload failure)
- [ ] No console errors
- [ ] At least one test covering the core flow
- [ ] Task board updated
- [ ] `/cost` logged in `COST_DASHBOARD.md`
- [ ] UI copy matches `VOICE_RULES.md`

## When to ask the user
- Ambiguous product decisions (copy, feature shape, priority)
- Any schema change that isn't already in `SCHEMA.md`
- Any change to the AI provider, escalator rules, or prompt version (currently `v1`)

## When NOT to ask
- Which Tailwind class to use
- Naming a component
- Refactoring for clarity within existing rules

## Additional Context
None.

## Created
2026-04-16
## Updated
2026-04-17
