# Where the tutorial clips come from

The 144 section clips and the 3 role tours are generated video — 582MB — and
are deliberately not in the repo. A site built from a checkout alone has none
of them.

That used to mean the deployed handbook rendered a dead player in every
section: a black box with controls that did nothing. It no longer does. A
clip that fails to load removes its whole figure and the prose closes over
it, so a deploy without clips is simply a handbook without videos rather than
a handbook that looks broken.

## Serving them

Both surfaces — `SectionClip.vue` and the four `getting-started/video-tour.md`
pages — read one setting:

```
VITE_CLIPS_BASE=https://<bucket-or-cdn>/clips
```

Unset, it falls back to `/clips`, which is what a local dev server and a local
build want, because `publish.mjs` writes the files into `public/clips/`.

Set it on the deploy (Cloudflare Pages: Settings → Environment variables) and
the pages point at the bucket instead. Nothing else changes, and the repo
still carries no video.

## Producing them

```
node tools/tour-video/batch.mjs      # record, narrate, render all 144 (~3.5h)
node tools/tour-video/publish.mjs    # copy into apps/docs/public/clips/
```

`batch.mjs` needs `DEEPGRAM_API_KEY` in the environment. It is resumable:
anything already in `out/` is left alone, so a stopped run costs nothing.

## Still to decide

Nothing hosts the clips yet. The options, roughly:

- **Cloudflare R2**, same account as Pages, public bucket, ~582MB. One upload
  per rebuild of the clip set.
- **Cloudflare Stream**, if adaptive bitrate matters more than simplicity.
  Changes the player, not just the URL.
- **Commit them.** Simplest to reason about and worst to live with: 582MB in
  git history forever, paid for by every clone.
