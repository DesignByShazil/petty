# Petty

Helps pet owners arrive at the vet with a clear, organised, trustworthy picture of what has been happening.

Owners log symptoms, behaviors, meds, and media. Petty builds a timeline and generates an AI vet-ready summary for the next appointment.

**Loop:** notice → log → organise → summarise → hand off → follow up.

---

## Tech

- **Next.js 16** (App Router) + Tailwind CSS v4 + TypeScript
- **Supabase** — Postgres, Auth, Storage, Edge Functions
- **Vercel** — hosting, preview deploys per PR
- **Claude Haiku 4.5** (default) / **Sonnet 4.6** (escalator) — vet summary

---

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Anthropic keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required env vars

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
SUMMARY_PROVIDER=claude   # or 'stub' for local dev without an API key
```

---

## Project pack

Every decision, schema, and task is documented in [`/docs/`](docs/). Start with [`docs/README.md`](docs/README.md).

| File | What it's for |
|---|---|
| `docs/CLAUDE.md` | Build rules for Claude Code |
| `docs/SYSTEM_CHARTER.md` | Why Petty exists, target user |
| `docs/MVP_PLAN.md` | The 6 MVP features |
| `docs/ARCHITECTURE.md` | Stack, data flow, AI interface |
| `docs/SCHEMA.md` | Database tables and RLS |
| `docs/TASK_BOARD.md` | Concrete tasks and subtasks |
| `docs/VOICE_RULES.md` | Product copy tone |
| `docs/Go_To_Market.md` | Launch plan |
| `docs/DECISIONS.md` | ADR log |
| `docs/Cost_Dashboard.md` | Token usage log |

---

## Status

MVP in progress. See [`docs/TASK_BOARD.md`](docs/TASK_BOARD.md) for what's shipped and what's next.
