# Decisions Log — Petty

An ADR-style log. Each entry captures a decision made while filling the pack gaps, so future sessions don't re-debate them.

---

## ADR-001: `Household` replaces `Workspace` as the sharing unit
**Date:** 2026-04-17
**Context:** Template carried `Workspace`, which is a B2B SaaS abstraction. The charter calls out "multi-person households caring for one pet" as a core pain point.
**Decision:** Rename `Workspace` to `Household`. Add `HouseholdMember` with roles `owner` and `caretaker`.
**Consequences:** Consumer-friendly language in UI. Household invites are a post-MVP task.

## ADR-002: Claude Haiku 4.5 primary, Sonnet 4.6 escalator
**Date:** 2026-04-18 (updates 2026-04-17 decision to stub)
**Context:** Summary is the product's "wow" moment. The task is structured writing (pet profile + log entries → ~400–800 word clinically-ordered markdown), not reasoning. Cost per summary matters: this runs every time a user preps for a vet visit, and the business model is $6/mo.
**Decision:**
- **Default provider:** Claude Haiku 4.5 — cheap (~$0.005/summary), strong at tone/structure, vision-capable for future photo work.
- **Escalator:** Claude Sonnet 4.6 when `entry_count > 100` OR `active_conditions > 3`. Expected ~10% of calls.
- **Stub:** `StubSummaryProvider` kept for local dev without an API key and for offline tests.
- **Selection:** env var `SUMMARY_PROVIDER` (`stub` | `claude`). Real provider branches internally on entry/condition counts.
- **Interface:** `SummaryProvider` port in `/lib/ai/summary.ts` stays unchanged — swapping vendors later is a one-file change.
**Consequences:**
- One vendor, one API key, one billing line.
- Cost envelope: ~$0.005–$0.02 per summary. Trivial at MVP volumes.
- Vision-ready for post-MVP photo captioning without a vendor switch.
- Prompt templates versioned as `v1` in `/lib/ai/prompts/v1/`.
- Re-evaluate provider after 30 days of real usage — if Haiku underperforms on tone/accuracy, move default to Sonnet or test GPT-5-mini behind the same interface.

## ADR-003: Supabase Storage for media
**Date:** 2026-04-17
**Context:** Architecture doc didn't name a media store.
**Decision:** Private Supabase Storage bucket `pet-media`. Signed URLs (10 min TTL) for reads. 100 MB per-file client-side limit. No video transcoding in MVP.
**Consequences:** One auth context; simpler RLS story. Larger videos will be rejected.

## ADR-004: LogEntry uses JSONB for kind-specific fields
**Date:** 2026-04-17
**Context:** A `symptom`, a `meal`, a `stool`, and an `activity` have different structured fields. A table-per-kind is overkill for MVP.
**Decision:** `log_entry.structured` is JSONB. Discriminated on `kind`. Validated in the app layer.
**Consequences:** Fast iteration on new kinds without migrations. Worse for analytics later — revisit if we ever need cross-kind aggregates beyond simple filters.

## ADR-005: Tags as `text[]` instead of a tag table
**Date:** 2026-04-17
**Context:** Tags need to be fast to write, fast to filter on, and low-ceremony.
**Decision:** `log_entry.tags text[]` with a GIN index. No separate `tag` table.
**Consequences:** No per-pet tag renaming. If we ever need cross-pet tag counts, revisit.

## ADR-006: PDF via `@react-pdf/renderer` in an Edge Function
**Date:** 2026-04-17
**Context:** Summary must export as PDF for printing and emailing.
**Decision:** Use `@react-pdf/renderer` server-side in a Supabase Edge Function. No headless Chrome.
**Consequences:** Smaller surface area, no container needed. PDFs will look template-driven rather than pixel-perfect — acceptable for a medical-ish document.

## ADR-007: No billing in MVP
**Date:** 2026-04-17
**Context:** GTM plan lists tentative pricing. Building Stripe costs a day we don't have.
**Decision:** Free tier only until a retention signal exists. "I want Pro" is a form, not a checkout.
**Consequences:** We learn willingness-to-pay before building payment. Re-open after 30 days of usage data.

## ADR-008: Target user description is long; we keep the short version in CLAUDE.md
**Date:** 2026-04-17
**Context:** The uploaded pack has a 100-word target-user paragraph pasted verbatim into every file. It's useful once, noise after that.
**Decision:** Keep the full version in `SYSTEM_CHARTER.md`. Everywhere else, reference it by link and use a one-sentence summary.
**Consequences:** Docs read cleaner. Search for "target user" lands on one source of truth.

## ADR-009: Web + PWA only — no native apps in MVP
**Date:** 2026-04-17
**Context:** Users log on mobile. Native apps are weeks of work.
**Decision:** Ship as a Next.js web app. Add a PWA manifest so users can "Add to Home Screen". No app store submission.
**Consequences:** Camera access via web APIs only. If adoption proves out, native becomes a post-launch track.

## ADR-010: Magic link auth, no password in MVP
**Date:** 2026-04-17
**Context:** Auth complexity was called out as a risk.
**Decision:** Email + magic link only. No password, no OAuth. Use Supabase Auth defaults.
**Consequences:** Simpler flow. We lose some users who distrust magic links — revisit if support requests pile up.

## ADR-012: Next.js 16 + Tailwind v4 (not Next 14 as originally specced)
**Date:** 2026-04-20
**Context:** The earlier pack specified Next.js 14. The scaffold that already existed in `/petty/` was created with `create-next-app@latest`, which produced Next.js 16.2.4 + Tailwind v4 + React 19.2.
**Decision:** Keep Next 16. No reason to downgrade.
**Consequences:**
- App Router is still the default; no behavioural change for Task 1–6 as specified.
- Tailwind v4 uses the new CSS-first config (`@theme` in `globals.css`), not `tailwind.config.js`. Anything that references a `tailwind.config.js` file should be updated.
- React 19 Server Actions and `use()` are available — fine for our use cases.
- ARCHITECTURE.md §Stack text updated to say "Next.js 16" where it said "Next.js 14".

## ADR-011: Prompt caching from day one
**Date:** 2026-04-18
**Context:** The pet profile + active conditions + active medications block is repeated across every summary for the same pet. It's also the longest static part of the prompt (~1–2k tokens).
**Decision:** Use Anthropic prompt caching on the pet-context block. Structure every summary call so the system prompt + pet-context is the cacheable prefix, and the log entries + date range + kind are the dynamic suffix.
**Consequences:**
- ~70% input cost savings on repeat summaries for the same pet.
- Cache key must include pet `updated_at` so stale profile data doesn't leak.
- Implemented behind the `SummaryProvider` interface so the stub doesn't care.

---

## Open Questions
- Do we invest in household invites in week 2, or wait for demand?
- Should summaries be editable by the user before export? (Likely yes — add to backlog.)
- At what user volume does prompt caching stop mattering vs. batch API? (Probably never at our scale, but flag.)

## Created
2026-04-17
