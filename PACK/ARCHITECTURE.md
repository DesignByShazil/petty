# Architecture — Petty

## Pack Type
Web SaaS

## Stack Decision
- Frontend: Next.js 14 + Tailwind CSS
- Backend: Supabase (Postgres + Auth)
- Auth: Supabase Auth
- Hosting: Vercel

## System Overview
Petty is a web saas that allows Primary target  Dog and cat owners who are actively engaged in their pet’s wellbeing  Best first niche:  owners of pets with recurring issues owners who visit the vet more than average anxious/high-care pet parents owners managing meds, symptoms, or recovery multi-person households caring for one pet Best first customer segment  I’d start with:  Owners of dogs with recurring skin, stomach, anxiety, or recovery-related issues  Why this segment:  frequent monitoring need repeat vet interactions lots of symptom tracking high emotional investment clear need for photos, notes, and trend summaries strong willingness to pay if it saves stress and improves care Secondary audiences cat owners with chronic or behavioral concerns owners of senior pets post-surgery pet owners rescue/adoption households adjusting to new pets clinics that want better-prepared clients to Help pet owners arrive at the vet with a clear, organised, trustworthy picture of what has been happening.

## Core Modules
1. Pet profile and care baseline
2. Daily symptom and behavior logging
3. Photo and video evidence capture
4. Smart timeline and pattern view
5. AI vet-ready summary

## Data Flow
User → [Input] → Supabase (Postgres + Auth) → [Process] → Response → User

## Key Decisions
| Decision | Chosen | Rejected | Reason |
|----------|--------|----------|--------|
| Database | Supabase (Postgres + Auth) | Firebase | Postgres preferred for relational data |
| Auth | Supabase Auth | Auth0 | Included with Supabase, lower cost |
| Hosting | Vercel | AWS | Simplest DX for Next.js |

## Out of Scope for MVP
- Wearable or smart collar integration
- Live telehealth or in-app vet consultations
- In-app store and product recommendations

## Risks
- Auth edge cases — test thoroughly before launch
- Data model changes mid-build — freeze schema at MVP start