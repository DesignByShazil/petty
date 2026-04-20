# Cost Dashboard — Petty

## Purpose
Track Claude token usage and costs per feature so we can spot waste early.

## Session Log

| Date | Feature | Model | Tokens In | Tokens Out | Cost (USD) | Notes |
|------|---------|-------|-----------|------------|------------|-------|
| 2026-04-16 | Setup | — | — | — | — | Project pack created |
| 2026-04-17 | Pack gap-fill | Claude (Cowork) | — | — | — | Filled SCHEMA, tightened ARCHITECTURE/CHARTER/CLAUDE/GTM/MVP/TASK_BOARD/VOICE_RULES, added DECISIONS and README |

## Weekly Review Checklist
- [ ] Which feature cost the most? Why?
- [ ] Were any sessions unusually expensive?
- [ ] Did any sessions fail to produce working output?
- [ ] What can move to a lighter model next time?

## Waste Patterns to Watch
- Loading full file trees when only 2-3 files needed
- Re-explaining context already in CLAUDE.md
- Using strong reasoning for UI formatting tasks
- Cowork + Claude Code doing the same thinking (agent overlap)
- Re-generating AI summaries on every page load — cache them in the `summary` row

## Rules of Thumb
- Draft copy, voice rewrites → smaller/cheaper model is fine
- Schema changes, architecture decisions → bigger model, but do it once
- Summary generation cost → track per summary once real provider is plugged in
