# MVP Plan — Petty

## Pack Type
Web SaaS

## Build Now
| # | Feature | Why It's In |
|---|---------|------------|
| 1 | Pet profile and care baseline | Supports core user flow |
| 2 | Daily symptom and behavior logging | Supports core user flow |
| 3 | Photo and video evidence capture | Supports core user flow |
| 4 | Smart timeline and pattern view | Supports core user flow |
| 5 | AI vet-ready summary | Supports core user flow |
| 6 | Reminders and follow-up tracking | Supports core user flow |

## Do Not Build Yet
| Feature | Reason Deferred |
|---------|----------------|
| Wearable or smart collar integration | Deferred post-MVP |
| Live telehealth or in-app vet consultations | Deferred post-MVP |
| In-app store and product recommendations | Deferred post-MVP |

## Main User Flow
1. Sign up

User creates account.

2. Add pet

User enters pet details, conditions, meds, and goals.

3. Start logging

User records symptoms, behaviors, routines, and uploads photos/videos when something happens.

4. Build timeline automatically

The app organizes all entries into a clear timeline.

5. Trigger summary need

User taps something like:

“Prepare for vet visit”
“Summarise last 7 days”
“Generate issue report”
6. AI generates vet handoff

The app creates a concise summary with:

symptoms
dates
frequency
supporting evidence
notable changes
care actions already taken
7. Export or share

User downloads PDF, emails it, or keeps it for the appointment.

8. Continue follow-up

After the appointment, user logs meds, treatment plan, recovery, and follow-up changes.

That is the whole core loop:
notice → log → organise → summarise → hand off → follow up

## Key Screens
1. Pet screen — Pet profile and care baseline
2. Daily screen — Daily symptom and behavior logging
3. Photo screen — Photo and video evidence capture
4. Smart screen — Smart timeline and pattern view

## Stack
- Frontend: Next.js 14 + Tailwind CSS
- Backend: Supabase (Postgres + Auth)
- Auth: Supabase Auth
- Hosting: Vercel

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Scope creep | High | Strict task board, no un-logged features |
| Auth complexity | Medium | Use Supabase Auth out of the box |
| Integration delays | Low | Defer third-party integrations post-MVP |

## Success Metric
Monthly active pet profiles with at least one completed care summary

## Timeline
MVP in a week