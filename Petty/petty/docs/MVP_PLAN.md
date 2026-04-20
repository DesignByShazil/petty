# MVP Plan — Petty

## Pack Type
Web SaaS

## Timeline
MVP in a week. One feature per day, QA-gated. No scope expansion without a task board row.

## Build Now

| # | Feature | Why It's In |
|---|---|---|
| 1 | Pet profile and care baseline | Nothing works without a pet to log against |
| 2 | Daily symptom and behavior logging | The actual daily-use habit |
| 3 | Photo and video evidence capture | Most-cited missing piece in vet visits |
| 4 | Smart timeline and pattern view | Converts log noise into a narrative |
| 5 | AI vet-ready summary | The moment of value. Stubbed provider in MVP |
| 6 | Reminders and follow-up tracking | Keeps users coming back after the summary |

## Do Not Build Yet

| Feature | Reason Deferred |
|---|---|
| Wearable / smart collar integration | Hardware partnerships; post-MVP |
| Live telehealth or in-app vet consultations | Regulatory + staffing; post-MVP |
| In-app store / affiliate recommendations | Monetization comes after retention proof |
| Vet-facing portal | Different customer; distribution play for later |
| Mobile native apps | Web + PWA covers MVP |
| Billing | Not until retention is proven — use manual "I want Pro" form |

## Main User Flow
1. Sign up (email + magic link)
2. Add pet (name, species, DOB, conditions, meds)
3. Log an entry (symptom / behavior / meal / stool / activity / incident / note)
4. Timeline builds automatically
5. Tap "Prepare for vet visit" or "Summarise last 7 days"
6. AI generates vet handoff (stubbed in MVP, real model later)
7. Export as PDF or email
8. Log follow-up after the appointment

Loop: **notice → log → organise → summarise → hand off → follow up**.

## Key Screens

| Screen | Purpose |
|---|---|
| `/pets` | List of pets in the household; CTA to add one |
| `/pets/[id]` | Pet overview — baseline, active conditions, active meds, recent log |
| `/pets/[id]/log` | Quick-entry logging UI — kind selector, body, tags, media |
| `/pets/[id]/timeline` | Full timeline with filter by kind/tag/date range |
| `/pets/[id]/summary/new` | Summary builder — pick range and kind, generate |
| `/pets/[id]/summary/[id]` | View / export / email the summary |
| `/reminders` | Cross-household due list |

## Stack
- Frontend: Next.js 14 (App Router) + Tailwind CSS
- Backend: Supabase (Postgres, Auth, Storage, Edge Functions)
- Auth: Supabase Auth (email + magic link)
- Hosting: Vercel
- AI: provider-agnostic, stubbed in MVP

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Scope creep | High | Strict task board; anything new needs a row |
| Auth edge cases | Medium | Supabase defaults only, no customization |
| Large video uploads | Medium | 100 MB client-side limit, advise compression |
| AI stub feels useless in early tests | Medium | Template is tight and clinically-ordered; ship real model by week 2 if early feedback demands it |
| Schema churn mid-build | Low | Schema frozen at Task 1 kickoff |

## Success Metric
Monthly active pet profiles with at least one completed care summary.

## Definition of Done (per feature)
- [ ] End-to-end happy path works
- [ ] Empty, loading, and error states handled
- [ ] At least one test covering the core flow
- [ ] Task board updated
- [ ] `/cost` logged
- [ ] Copy matches `VOICE_RULES.md`

## Created
2026-04-16
## Updated
2026-04-17
