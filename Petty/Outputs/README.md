# Petty — Project Pack

This folder is the **complete build pack for Petty**. Everything a builder (human or Claude Code) needs to go from idea to shipped MVP lives here.

## What is Petty?
A Web SaaS for dog and cat owners who are tracking a recurring issue. Owners log symptoms, behaviors, meds, and media. When it's time for the vet, they tap a button and get a clean summary to print or email.

**Loop:** notice → log → organise → summarise → hand off → follow up.

---

## Read in this order

1. **[SYSTEM_CHARTER.md](SYSTEM_CHARTER.md)** — why Petty exists, who it's for, what's out of scope
2. **[MVP_PLAN.md](MVP_PLAN.md)** — the 6 features to build, ordered
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** — stack, modules, data flow, AI interface, media pipeline
4. **[SCHEMA.md](SCHEMA.md)** — every table, every column, RLS sketch
5. **[TASK_BOARD.md](TASK_BOARD.md)** — the work, sliced into tasks with concrete subtasks
6. **[VOICE_RULES.md](VOICE_RULES.md)** — how the product talks
7. **[Go_To_Market.md](Go_To_Market.md)** — positioning, channels, launch assets
8. **[DECISIONS.md](DECISIONS.md)** — ADR log — why the pack looks the way it does
9. **[CLAUDE.md](CLAUDE.md)** — rules for Claude Code sessions
10. **[Cost_Dashboard.md](Cost_Dashboard.md)** — token usage log

---

## What changed from the uploaded pack

The uploaded pack had the right intent but several placeholders and repetition. Gaps filled:

- **SCHEMA.md** — was a template with `[Primary Entity — replace...]`. Now has real tables: `User`, `Household`, `HouseholdMember`, `Pet`, `Condition`, `Medication`, `MedicationDose`, `LogEntry`, `Media`, `Summary`, `Reminder`, with RLS sketch.
- **ARCHITECTURE.md** — added Supabase Storage, a provider-agnostic AI interface (`SummaryProvider`), media pipeline, and a repo structure.
- **SYSTEM_CHARTER.md / CLAUDE.md / Go_To_Market.md** — replaced the 100-word target-user paragraph pasted into every file with a single-source-of-truth in the charter and a one-liner everywhere else.
- **GO_TO_MARKET.md** — added a real one-liner, a cleaner audience table, anti-goals, and provisional pricing.
- **TASK_BOARD.md** — added Task 0 (setup) and concrete subtasks for every feature, plus dependencies.
- **VOICE_RULES.md** — added pet-specific examples, an anti-cutesy rule, inclusivity notes.
- **DECISIONS.md** — new. 10 ADRs capturing the choices made filling gaps.

See DECISIONS.md for the "why" behind each change.

---

## Build order

1. **Task 0 — Setup** — Next.js + Supabase + Vercel, deploy from `main`
2. **Task 1 — Pet profile** — no point building anything else without a pet
3. **Task 2 — Logging** — the daily-use habit
4. **Task 3 — Media** — the "aha" before the timeline
5. **Task 4 — Timeline** — turns noise into narrative
6. **Task 5 — Summary** — the moment of value (stub the AI)
7. **Task 6 — Reminders** — the returning-user hook

One task `in_progress` at a time. QA each slice against the Definition of Done. Log `/cost` after every session.

---

## Target: MVP in a week

Day 1 — Task 0 + Task 1
Day 2 — Task 2
Day 3 — Task 3
Day 4 — Task 4
Day 5 — Task 5 (stub provider)
Day 6 — Task 6
Day 7 — Polish, deploy, GTM assets, first 10 users

If anything slips, drop Task 6 before shrinking anything earlier — Tasks 1-5 are the complete loop.

---

## Success metric
Monthly active pet profiles with at least one completed care summary.

## Created
2026-04-17
