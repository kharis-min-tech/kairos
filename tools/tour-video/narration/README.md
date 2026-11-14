# Narration scripts

One JSON file per role. Each entry is a stop on the tour:

```json
{
  "role": "member",
  "voice": "athena",
  "stops": [
    {
      "n": 1,
      "title": "Signing in",
      "caption": "One account, whichever way you sign in.",
      "speech": "Kairos opens on the sign-in page. You can use an email address and password, or Google, Microsoft or Apple — all four arrive at the same account."
    }
  ]
}
```

| Field | Goes where |
|---|---|
| `title` | the bold line of the lower third |
| `caption` | the quiet line under it |
| `speech` | spoken by Deepgram, and the source of the per-word caption timings |

`speech` is the only field sent to Deepgram. `title` and `caption` are drawn
by Remotion and never leave this machine.

Scripture is a special case: write the reference in `caption` and let the
narration quote the verse in `speech`. Do not paraphrase a verse to make it
scan — the wording is a licensing matter as much as a linguistic one, and
`packages/core/src/auth-verses.ts` explains which versions this project may
quote.
