# CLAUDE.md

This file instructs Claude Code. The full build pack lives in `/docs/`.

**Read these first (in order):**
1. [`docs/CLAUDE.md`](docs/CLAUDE.md) — build rules, definition of done
2. [`docs/SYSTEM_CHARTER.md`](docs/SYSTEM_CHARTER.md) — why Petty exists
3. [`docs/MVP_PLAN.md`](docs/MVP_PLAN.md) — the 6 features
4. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack, AI interface, media pipeline
5. [`docs/SCHEMA.md`](docs/SCHEMA.md) — database tables and RLS
6. [`docs/TASK_BOARD.md`](docs/TASK_BOARD.md) — the work, in order
7. [`docs/VOICE_RULES.md`](docs/VOICE_RULES.md) — how the product talks
8. [`docs/DECISIONS.md`](docs/DECISIONS.md) — ADR log — why things are the way they are

## Quick summary
Petty is a web SaaS for dog/cat owners tracking recurring health issues. They log symptoms, meds, and media; the app builds a timeline and generates an AI vet-ready summary.

**Stack:** Next.js 16 (App Router) + Tailwind v4 + Supabase (Postgres, Auth, Storage) + Vercel.
**AI:** Claude Haiku 4.5 (default) with Sonnet 4.6 escalator.

## Build order
Task 0 (setup) → 1 (Pet profile) → 2 (Logging) → 3 (Media) → 4 (Timeline) → 5 (AI summary) → 6 (Reminders).
One task `in_progress` at a time. See `docs/TASK_BOARD.md` for concrete subtasks.

## Rules of the road
- No features outside the task board
- Read `docs/SCHEMA.md` before touching the database
- Every piece of user-facing copy must match `docs/VOICE_RULES.md`
- Run `/cost` after each session and append to `docs/Cost_Dashboard.md`
