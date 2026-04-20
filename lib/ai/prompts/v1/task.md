# Task

Generate a vet-ready summary of kind `{{kind}}` covering entries from **{{range_start}}** to **{{range_end}}**.

{{issue_focus_block}}

## Log entries ({{entry_count}})
{{entries}}

## Output format

```
# {{pet_name}} — {{kind_title}}
_Generated {{generated_at}} · Range {{range_start}} → {{range_end}}_

## Headline
One or two sentences summarising the most important thing a vet should know.

## Key observations
- Bullet list, grouped by theme (skin, GI, behavior, appetite, etc.).
- Every claim cites at least one date range.

## Frequency
- Short counts: "Scratching: 5 of 7 days", "Vomiting: 2 episodes (Apr 11, Apr 14)".

## Recent changes
- New symptoms, escalations, or resolutions in the last 7 days.

## Meds and treatments
- What was given, when, and any owner-reported response.

## Owner notes
- Anything the owner flagged or questioned.
```

Keep the entire response under 1200 tokens.
