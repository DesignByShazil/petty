# Task Board — Petty

## Status Types
- `planned` — not started
- `in_progress` — active in Claude Code session
- `completed` — done, QA passed
- `blocked` — waiting on a decision

## Sprint Rules
- Max 1 task `in_progress` at a time
- Complete and QA each slice before the next
- Never expand scope without adding a task row

---

## Task 0 — Project setup
- Status: `completed`
- Goal: Next.js 14 app, Supabase project, Tailwind, env wiring, CI
- Subtasks:
  - [x] `npx create-next-app@latest petty --ts --tailwind --app`
  - [x] Supabase project created; keys in `.env.local` and Vercel
  - [x] `@supabase/supabase-js` + `@supabase/ssr` installed
  - [x] Base layout, sign-in page
  - [ ] Vercel deploy from main — **manual step: connect repo in Vercel dashboard**
  - [x] GitHub Actions: typecheck + tests on PR
- Success: `main` deploys; a logged-in user lands on an empty `/pets`
- Effort: Small

---

## Task 1 — Pet profile and care baseline
- Status: `completed`
- Goal: Create and edit a pet with conditions and meds
- Subtasks:
  - [x] Migration: `household`, `household_member`, `pet`, `condition`, `medication` tables with RLS
  - [x] Auto-create `household` + owner `household_member` on first sign-in
  - [x] `/pets` list page (empty state from VOICE_RULES)
  - [x] `/pets/new` form — name, species, breed, sex, DOB, weight, vet info, notes
  - [x] `/pets/[id]` overview — baseline card, conditions list, meds list
  - [x] Add/edit/remove condition inline
  - [x] Add/edit/remove medication inline
  - [x] Test: create pet → edit → add condition → add medication
- Success: User can create a pet, add 2 conditions and 2 meds, see them on the overview
- Effort: Medium

## Task 2 — Daily symptom and behavior logging
- Status: `completed`
- Goal: Quick entry of a log item against a pet
- Subtasks:
  - [x] Migration: `log_entry` table with RLS and `(pet_id, occurred_at DESC)` index
  - [x] `/pets/[id]/log` quick-entry form — kind selector, severity 1–5, tags (chips), body, occurred_at (default now)
  - [x] Kind-specific structured fields (meal: food/amount, stool: Bristol score, etc.) via discriminated union
  - [x] Recent-entries strip on pet overview (last 5)
  - [x] Edit and delete own entries; soft delete
  - [x] Test: log symptom, log meal, edit severity, delete
- Success: User can log 5 entries across 3 kinds in under 2 minutes
- Effort: Medium

## Task 3 — Photo and video evidence capture
- Status: `completed`
- Goal: Attach media to a log entry
- Subtasks:
  - [x] Create Supabase Storage bucket `pet-media` (private) + RLS policy
  - [x] Migration: `media` table
  - [x] Server action: signed upload URL scoped to a pet
  - [x] Client: drop zone + file picker, up to 6 files per entry, 100 MB each
  - [x] EXIF `captured_at` extraction where available
  - [x] Thumbnail in timeline via signed URL (10 min TTL)
  - [x] Delete media row + storage object in one transaction
  - [x] Test: upload photo, upload video, oversized rejected, thumbnail renders
- Success: Media attaches to entry, renders on timeline, removable
- Effort: Medium

## Task 4 — Smart timeline and pattern view
- Status: `completed`
- Goal: Chronological view with filters and simple pattern highlights
- Subtasks:
  - [x] `/pets/[id]/timeline` — day-grouped list, newest first
  - [x] Filters: kind, tag, date range
  - [x] Tag cloud showing most-used tags in the last 30 days
  - [x] "Pattern highlights" card: e.g. "Scratching logged on 6 of last 7 days" — simple SQL aggregations, no ML
  - [x] Infinite scroll or pagination at 50 entries/page
  - [x] Test: filter by kind, filter by tag, verify ordering
- Success: Owner can scan two weeks of entries, filter to "scratching", see that it's been logged on most days
- Effort: Medium

## Task 5 — AI vet-ready summary
- Status: `completed`
- Goal: Generate and export a clinically-ordered handoff
- Subtasks:
  - [x] Migration: `summary` table
  - [x] `/lib/ai/summary.ts` — `SummaryProvider` interface + `StubSummaryProvider` (deterministic template, works with no API key)
  - [x] `/lib/ai/providers/claude.ts` — `ClaudeSummaryProvider` with internal Haiku↔Sonnet escalator (`entries > 100 || active_conditions > 3` → Sonnet)
  - [x] Prompt templates in `/lib/ai/prompts/v1/` — `system.md`, `pet-context.md`, `task.md`
  - [x] Prompt caching: mark pet-context block with `cache_control: { type: 'ephemeral' }`; cache key includes `pet.updated_at`
  - [x] Server action `generateSummary` — pulls pet + conditions + meds + entries in range, calls provider, writes `summary` row with `{model, prompt_version, input_entry_ids, usage}` (used Next.js server action in place of an Edge Function since auth + RLS already works from SSR)
  - [ ] Env: `ANTHROPIC_API_KEY`, `SUMMARY_PROVIDER=claude` in Vercel + Supabase — **manual step**
  - [x] `/pets/[id]/summary/new` — pick kind (vet visit / range / issue report), pick date range, generate
  - [x] `/pets/[id]/summary/[id]` — view as markdown + "Download PDF"
  - [x] PDF render via `@react-pdf/renderer` server-side, stored at `pdf_storage_path`
  - [x] Hard cap: `max_tokens = 1200`
  - [x] Fallback: on Anthropic API error, degrade to `StubSummaryProvider` and flag the summary as `status: 'draft'`
  - [x] Test: generate with 10 entries (Haiku), generate with 150 entries (escalates to Sonnet), stub still works with `SUMMARY_PROVIDER=stub`
- Success: User generates a summary from 2 weeks of data and downloads a clean PDF. Second call on the same pet shows a lower `inputTokens` due to cache hit.
- Effort: Large
- Dependency: Tasks 1–4

## Task 6 — Reminders and follow-up tracking
- Status: `completed`
- Goal: Med doses and vet-followups surface when they're due
- Subtasks:
  - [x] Migration: `reminder`, `medication_dose` tables
  - [x] Auto-generate reminders from active medications on save
  - [x] `/reminders` page — grouped by today / this week / later
  - [x] "Mark given / missed / refused" inline → creates `medication_dose`
  - [x] Home redirect: if reminders due today, show them above pet list
  - [x] Test: create daily med → reminder appears → mark given → dose recorded
- Success: User adds a twice-daily medication and sees 14 reminders across the next week
- Effort: Medium

---

## Task 7 — Household invites
- Status: `in_progress`
- Goal: Owner sends an email invite; invitee signs in and joins the household as a caretaker
- Subtasks:
  - [ ] Migration: `invite` table (token, email, household_id, invited_by, expires_at, accepted_at)
  - [ ] Server action: `createInvite` — owner only, generates token, emails magic-link style invite
  - [ ] `/invite/[token]` accept page — validates token, upserts `household_member`, marks accepted
  - [ ] `/settings/household` — member list + invite form + remove member (owner only)
  - [ ] Test: create invite, accept invite, expired token rejected, non-owner cannot invite
- Success: Owner invites a caretaker by email; caretaker sees the same pets after signing in
- Effort: Medium

## Backlog (deferred)
- [ ] Wearable / smart collar integration
- [ ] Live telehealth or in-app vet consultations
- [ ] In-app store / affiliate recommendations
- [ ] Vet-facing portal
- [ ] Billing (Stripe) — after retention is proven

## Completed
- Task 0 — Project setup (2026-04-18)
- Task 1 — Pet profile and care baseline (2026-04-18)
- Task 2 — Daily symptom and behavior logging (2026-04-18)
- Task 3 — Photo and video evidence capture (2026-04-18)
- Task 4 — Smart timeline and pattern view (2026-04-19)
- Task 5 — AI vet-ready summary (2026-04-19)
- Task 6 — Reminders and follow-up tracking (2026-04-20)

## Created
2026-04-16
## Updated
2026-04-17 — added Task 0 setup, concrete subtasks for every feature, dependencies
