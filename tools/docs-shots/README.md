# docs-shots

Takes the handbook's screenshots, in any of the four languages, from the
running app.

```
npm run dev -w @kairos/api      # :3001
npm run dev -w @kairos/web      # :3002
node shoot.mjs --lang fr
```

Writes 48 PNGs to `apps/docs/public/screenshots/<lang>/` — or to
`apps/docs/public/screenshots/` itself for `--lang en`.

## Why it exists

The translated handbook points every image at `/screenshots/<lang>/…`,
because a French page showing an English screen is the thing the translation
was for. The original English screenshots were taken by hand and could not be
reproduced, so the first build of the translated handbook simply failed on 144
missing files.

`shots.mjs` is the table: one row per image, naming its route, its theme and
any preparation. The names are inconsistent (`x` / `x-dark` in some pairs,
`x-light` / `x` in others, `regions` / `regions-black`) because they are
already referenced from 42 pages in four languages; the table maps each one to
what produces it rather than renaming anything.

## Flags

| Flag | Default | What it does |
|---|---|---|
| `--lang` | `en` | Language to shoot, and the subfolder written to |
| `--base` | `http://localhost:3002` | Where the app is |
| `--only` | all | Comma-separated image names, for re-taking a few |
| `--out` | `apps/docs/public/screenshots` | Output root |
| `--headed` | off | Run a visible browser |

## Known gap: the map

Four images per language show the fellowship map, and they currently render as
flat water with no land on them.

The cause is not this tool. `NEXT_PUBLIC_MAPBOX_TOKEN` is set to the literal
placeholder `your-mapbox-public-token`, so Mapbox rejects the style request
and only the background colour is drawn. It also has to live in
`apps/web/.env.local`: Next reads `.env` files from the app directory, so a
token in the repo-root `.env` never reaches the browser.

With a real public token in `apps/web/.env.local`, these four put it right:

```
for l in fr kri tw; do
  node shoot.mjs --lang $l --only \
    fellowships-map-light,fellowships-map-dark,nearest-fellowship-light,nearest-fellowship-dark
done
```

The surrounding interface in those four is correctly translated either way;
it is only the tiles that are missing.

## Notes

- One browser context per theme. next-themes reads a localStorage key and the
  app reads its language from a cookie during the server render, so both are
  seeded before the first paint — a toggled theme is caught mid-transition and
  a toggled language flashes English first.
- Signed-out shots (`login`) are taken before authenticating, since `/login`
  redirects away afterwards.
- The consent gate is cleared explicitly after sign-in. It fires on
  navigation, not at sign-in, so without this it appears halfway through a run
  on a freshly seeded database.
- Sign-in is retried: submitting before React has hydrated posts the form the
  browser's own way and lands on `/login?email=…`, which is what happens when
  the machine is busy rendering video at the same time.
