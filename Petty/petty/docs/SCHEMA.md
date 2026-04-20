# Schema — Petty

## Pack Type
Web SaaS

## Rules
- No duplicate logic structures
- Keep schema stable during MVP
- Add fields only when required by a task board feature
- Reference this file in every Claude Code session
- All tables have Row Level Security (RLS) on — users can only read/write their own household's data
- Timestamps are `timestamptz` (UTC); convert in the client
- Soft delete via `deleted_at` where it matters; hard delete otherwise

---

## Entity Map

```
Household ──┬── HouseholdMember (User)
            ├── Pet ──┬── Condition
            │         ├── Medication ── MedicationDose
            │         ├── LogEntry ── Media
            │         ├── Summary
            │         └── Reminder
            └── (shared pets across caretakers)
```

A pet belongs to one `Household`. A user can belong to many households (own one, share another). Multiple caretakers on one pet was called out as a core pain point in the charter — `Household` is the answer.

---

## Core Objects

### User
Backed by `auth.users` in Supabase Auth. The public `users` row mirrors it.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | = `auth.users.id` |
| email | citext (unique) | |
| display_name | text | |
| avatar_url | text | nullable |
| subscription_tier | enum [`free`, `pro`] | default `free` |
| created_at | timestamptz | default `now()` |

### Household
Replaces the template's `Workspace`. A unit of shared pet care.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | e.g. "The Patel Pack" |
| owner_id | uuid (FK → User) | who created it |
| created_at | timestamptz | |

### HouseholdMember
Join table — lets a pet be shared across caretakers.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| household_id | uuid (FK → Household) | |
| user_id | uuid (FK → User) | |
| role | enum [`owner`, `caretaker`] | |
| invited_email | citext | nullable — pending invites |
| created_at | timestamptz | |

Unique: `(household_id, user_id)`.

### Pet
The core object. Everything else hangs off a pet.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| household_id | uuid (FK → Household) | |
| name | text | |
| species | enum [`dog`, `cat`, `other`] | MVP: dog & cat |
| breed | text | nullable |
| sex | enum [`male`, `female`, `unknown`] | |
| neutered | boolean | nullable |
| date_of_birth | date | nullable — we show approximate age |
| weight_kg | numeric(5,2) | nullable, latest known |
| microchip_id | text | nullable |
| vet_name | text | nullable |
| vet_contact | text | nullable |
| avatar_url | text | nullable |
| notes | text | free-form baseline |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | nullable — soft delete |

### Condition
Known ongoing issues — drives summary context.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| pet_id | uuid (FK → Pet) | |
| label | text | e.g. "atopic dermatitis" |
| status | enum [`active`, `resolved`, `monitoring`] | |
| started_on | date | nullable |
| resolved_on | date | nullable |
| notes | text | |
| created_at | timestamptz | |

### Medication
Current or past meds. A medication row is the prescription; doses log adherence.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| pet_id | uuid (FK → Pet) | |
| name | text | e.g. "Apoquel" |
| dose_amount | text | e.g. "5.4 mg" — kept as text for flexibility |
| schedule | text | e.g. "twice daily" |
| start_date | date | |
| end_date | date | nullable |
| prescribed_by | text | nullable |
| active | boolean | default true |
| notes | text | |
| created_at | timestamptz | |

### MedicationDose
A record that a dose was given (or missed).

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| medication_id | uuid (FK → Medication) | |
| given_at | timestamptz | |
| given_by | uuid (FK → User) | nullable |
| status | enum [`given`, `missed`, `refused`] | |
| notes | text | |

### LogEntry
The heart of the product. Every observation lands here.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| pet_id | uuid (FK → Pet) | |
| author_id | uuid (FK → User) | |
| occurred_at | timestamptz | when it happened (not when logged) |
| kind | enum [`symptom`, `behavior`, `meal`, `stool`, `activity`, `incident`, `note`] | |
| severity | smallint | 1–5 scale, nullable for non-symptom kinds |
| tags | text[] | e.g. `{scratching, ears, hind-leg}` |
| body | text | free-form note |
| structured | jsonb | kind-specific fields (see below) |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | nullable |

`structured` examples by `kind`:
- `symptom`: `{ area: "ears", duration_minutes: 20 }`
- `meal`: `{ food: "hill's z/d", amount_g: 150, finished: true }`
- `stool`: `{ bristol_score: 5, has_blood: false }`
- `activity`: `{ type: "walk", minutes: 30 }`

Index: `(pet_id, occurred_at DESC)` — timeline reads hit this constantly.

### Media
Photos and videos attached to a log entry.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| log_entry_id | uuid (FK → LogEntry) | |
| pet_id | uuid (FK → Pet) | denormalized for RLS |
| storage_path | text | Supabase Storage key |
| mime_type | text | `image/jpeg`, `video/mp4`, … |
| width | int | nullable |
| height | int | nullable |
| duration_seconds | numeric | nullable, video only |
| size_bytes | bigint | |
| captured_at | timestamptz | from EXIF if available |
| created_at | timestamptz | |

Storage bucket: `pet-media` (private). Signed URLs for reads. See ARCHITECTURE.md §Media.

### Summary
An AI-generated vet handoff. Keep the input range so we can regenerate deterministically.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| pet_id | uuid (FK → Pet) | |
| author_id | uuid (FK → User) | who triggered it |
| kind | enum [`vet_visit`, `range`, `issue_report`] | |
| range_start | timestamptz | inclusive |
| range_end | timestamptz | inclusive |
| prompt_version | text | e.g. `"v1"` — for reproducibility |
| model | text | e.g. `"stub"`, `"claude-sonnet-4-6"` |
| input_entry_ids | uuid[] | entries fed to the model |
| body_markdown | text | the generated summary |
| pdf_storage_path | text | nullable — rendered PDF |
| status | enum [`draft`, `final`] | |
| created_at | timestamptz | |

### Reminder
Medication and follow-up scheduling.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| pet_id | uuid (FK → Pet) | |
| kind | enum [`medication`, `vet_followup`, `observation`] | |
| title | text | |
| due_at | timestamptz | |
| recurrence | text | nullable — RFC 5545 RRULE string |
| medication_id | uuid (FK → Medication) | nullable |
| completed_at | timestamptz | nullable |
| created_at | timestamptz | |

---

## Row Level Security (sketch)

Every table has RLS enabled. The canonical check is:

```sql
-- Pet: user can see a pet if they're a member of its household
create policy "pet_read" on pet for select
using (
  household_id in (
    select household_id from household_member where user_id = auth.uid()
  )
);
```

Same pattern cascades: LogEntry → Pet → Household → HouseholdMember. Write policies mirror reads; destructive operations are restricted to `role = 'owner'`.

---

## Out of Scope for MVP Schema
- Vet clinic accounts (read-only shared summaries)
- Marketplace / affiliate product tables
- Wearable ingest tables

## Notes
- `tags` as `text[]` is fine for MVP. Move to a dedicated `tag` table only if we need counts across pets.
- Do not add `breeds` lookup tables — free text is faster and good enough.
- `structured` JSONB is intentional so we can iterate `kind` without migrations.

## Created
2026-04-16
## Updated
2026-04-17 — filled in from template; added Household, Pet, LogEntry, Media, Summary, Medication, MedicationDose, Reminder, Condition
