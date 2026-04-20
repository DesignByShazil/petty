# CLAUDE.md — Petty

## Mission
Petty helps Primary target  Dog and cat owners who are actively engaged in their pet’s wellbeing  Best first niche:  owners of pets with recurring issues owners who visit the vet more than average anxious/high-care pet parents owners managing meds, symptoms, or recovery multi-person households caring for one pet Best first customer segment  I’d start with:  Owners of dogs with recurring skin, stomach, anxiety, or recovery-related issues  Why this segment:  frequent monitoring need repeat vet interactions lots of symptom tracking high emotional investment clear need for photos, notes, and trend summaries strong willingness to pay if it saves stress and improves care Secondary audiences cat owners with chronic or behavioral concerns owners of senior pets post-surgery pet owners rescue/adoption households adjusting to new pets clinics that want better-prepared clients Help pet owners arrive at the vet with a clear, organised, trustworthy picture of what has been happening.

## Pack Type
Web SaaS

## Stack
- Frontend: Next.js 14 + Tailwind CSS
- Backend: Supabase (Postgres + Auth)
- Auth: Supabase Auth
- Hosting: Vercel

## Repo Structure
```
/app           → main application
/components    → reusable UI components
/hooks         → custom React hooks
/lib           → shared utilities
/migrations    → database migrations
/tests         → unit + integration tests
```

## Build Rules
- MVP only — no features outside the task board
- Keep components small and reusable
- No duplicated logic — extract to /lib
- Write tests for all core flows
- Run /cost after each session and log it
- Reference SCHEMA.md before touching the database

## Core User Flow
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

## Out of Scope
- Wearable or smart collar integration
- Live telehealth or in-app vet consultations
- In-app store and product recommendations

## Definition of Done (per feature)
- [ ] Feature works end-to-end
- [ ] Edge cases handled
- [ ] No console errors
- [ ] Test written
- [ ] Task board updated
- [ ] /cost logged

## Additional Context
None.