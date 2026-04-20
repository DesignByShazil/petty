# Schema — Petty

## Pack Type
Web SaaS

## Rules
- No duplicate logic structures
- Keep schema stable during MVP
- Add fields only when required by a task board feature
- Reference this file in every Claude Code session

---

## Core Objects

### User
id: uuid (PK)
email: string (unique)
name: string
subscription_tier: enum [free, pro]
created_at: timestamp

### Workspace
id: uuid (PK)
owner_id: uuid (FK → User)
name: string
created_at: timestamp

### [Primary Entity — replace with Petty's core object]
id: uuid (PK)
workspace_id: uuid (FK → Workspace)
title: string
status: enum [draft, active, completed, archived]
created_at: timestamp
updated_at: timestamp

---

## Notes
No additional constraints.

## Created
2026-04-16