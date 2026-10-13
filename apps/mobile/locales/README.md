# Mobile translations

Kairos mobile speaks English, French, Krio and Twi. This folder holds one JSON
catalogue per language. The plumbing is complete; the catalogues are being
filled in screen by screen.

## How it fits together

| Piece | Where |
|---|---|
| i18next setup, language list, device detection | `lib/i18n.ts` |
| Persisted user preference | `store/locale.ts` (`kairos.language` in AsyncStorage) |
| Hydration on boot, before first paint | `app/_layout.tsx` |
| The picker | `app/language.tsx`, reached from More → Settings → Language |

`'system'` is the default: Kairos uses the device language when it ships that
language, and English otherwise. Choosing a language in the picker overrides
that, applies immediately, and is remembered on the device.

## Namespaces

Top-level keys in each catalogue, as agreed on the card:

`common`, `more`, `settings`, `auth`, `forms`, `myGroups`, `rollcall`,
`reports`, `members`, `fellowships`, `departments`, `branches`, `security`,
`admin`, `help`

Reference a string with its namespace: `t('more:rows.language')`. The bare form
`t('rows.language')` resolves against the first namespace passed to
`useTranslation`, which is easy to get subtly wrong, so prefer `ns:key`.

```tsx
const { t } = useTranslation(['settings', 'common']);
<Text>{t('settings:language.title')}</Text>
<Text>{t('common:cancel')}</Text>
```

## Status

| Language | Code | State |
|---|---|---|
| English | `en` | Baseline. Every extracted key lives here first. |
| French | `fr` | Complete for everything extracted so far (auth, more, settings). |
| Krio | `kri` | **Empty.** Awaiting a translator. |
| Twi | `tw` | **Empty.** Awaiting a translator. |

Krio and Twi are deliberately empty rather than machine-translated. Every key
falls through to English (`fallbackLng`), so the app stays correct and usable
in those languages while the words are found. `lib/i18n.ts` marks them
`translated: false`, which is what puts "Translation in progress" under them in
the picker. Flip that flag when a catalogue lands.

A wrong translation in a pastoral or safeguarding screen is worse than English,
which is why these are blank and not guessed.

## Extraction progress

Done: all of `app/(auth)` (11 screens), `app/(tabs)/more.tsx`,
`app/appearance.tsx`, `app/language.tsx`.

**66 of 111 screens still hold literal UI strings.** By area:

| Area | Screens left | Area | Screens left |
|---|---|---|---|
| `(tabs)` | 2 of 6 | `new-believers` | 4 of 5 |
| `admin` | 1 of 3 | `outreach` | 2 of 3 |
| `attendance` | 2 of 3 | `reports` | 1 of 2 |
| `branches` | 4 of 5 | `rollcall` | 1 of 3 |
| `departments` | 7 of 8 | `rota-admin` | 5 of 5 |
| `fellowships` | 7 of 8 | `security` | 3 of 4 |
| `forms` | 2 of 4 | `settings` | 1 of 3 |
| `members` | 5 of 6 | `souls` | 3 of 3 |
| `membership` | 4 of 7 | | |

Find the stragglers with:

```bash
grep -rlE 'label="[A-Z]|title: '\''[A-Z]|placeholder="[A-Z]' app --include='*.tsx'
```

That grep only catches single-line literals. Multi-line JSX prose needs a
second look by eye — search for a `<Text>` whose content starts on the
following line.

### Two patterns worth copying from `(auth)`

**Prose with a value in it** uses `<Trans>` so the emphasis survives word-order
changes, rather than being glued together from fragments:

```tsx
<Trans
  i18nKey="auth:forgotPassword.sentTo"
  values={{ email: email.trim() }}
  components={[<Text key="0" />, <Text key="1" style={styles.bodyStrong} />]}
/>
```

**Values that travel to the API stay English.** `RELATIONSHIP_OPTIONS` and the
gender chips keep `'Spouse'`, `'Male'` and the rest as their stored values; only
the label is translated, via `t(\`auth:relationships.${r}\`)`. Translating the
value itself would write French into the database.

**Code outside a component** cannot use the hook. `fetchMemberProfile` in
`login.tsx` and `signup.tsx` imports the `i18n` singleton and calls `i18n.t(...)`.

## Adding a language

1. Copy `en.json` to `<code>.json` and translate the values, not the keys.
2. Add it to `LANGUAGES` in `lib/i18n.ts` with its endonym as `label`.
3. Add the code to `VALID` in `store/locale.ts`.
4. Import it into the `resources` map in `lib/i18n.ts`.

Partial catalogues are fine at every step: anything missing falls back to
English.

## Fonts

Twi is written in Latin script but needs **ɔ** (U+0254) and **ɛ** (U+025B).

The app bundles no custom font and sets no `fontFamily`, so it renders in the
platform system font. Both characters are present in the iOS/macOS system font
(verified against `SFNS.ttf`) and in Android's Roboto, which covers the IPA
Extensions block. No fallback font is needed.

Worth one device check against real Twi copy when it lands, since that is the
first time these glyphs will appear in anger.

## French line length

French runs roughly 15% longer than English, so it is the language that will
expose fixed widths and single-line truncation. Switch to French and walk each
screen as you extract it, rather than leaving a layout pass to the end.
