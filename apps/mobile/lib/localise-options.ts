/**
 * Swap the English label on a `{ value | key, label }` option for its
 * catalogue entry, keyed by the option's own value.
 *
 * Option lists are declared at module scope, where there is no `t` to call,
 * so the English stays in the constant and the translation happens at the
 * render site. The value is untouched: it is what the API stores and compares.
 *
 * An option with no catalogue entry keeps its English label rather than
 * rendering a key path, so a new option still reads before it is translated.
 *
 * Mirrors `apps/web/src/lib/localise-options.ts`.
 */
type Translate = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Make a value safe to paste into a translation key.
 *
 * i18next will not resolve a key that contains a space: `status_Following Up`
 * silently falls back, while `status_New` right beside it resolves. That cost
 * a whole souls board column its translation, with nothing failing anywhere to
 * say so. Only whitespace is replaced -- a hyphen resolves fine, and rewriting
 * it would break the `session-1` keys that already work.
 */
export function keySlug(value: string | number): string {
  return String(value).trim().replace(/\s+/g, '_');
}

export function localiseOptions<T extends { label: string }>(
  t: Translate,
  prefix: string,
  options: readonly T[],
  valueOf: (o: T) => string | number = (o) => (o as { value?: string | number }).value ?? '',
): T[] {
  return options.map((o) => ({
    ...o,
    label: t(`${prefix}${keySlug(valueOf(o))}`, { defaultValue: o.label }),
  }));
}

/** The same lookup for a record keyed by status, e.g. `{ applied: { label } }`. */
export function localiseMeta<T extends { label: string }>(
  t: Translate,
  prefix: string,
  meta: Record<string, T>,
  key: string,
): T {
  const entry = meta[key];
  if (!entry) return entry;
  return { ...entry, label: t(`${prefix}${keySlug(key)}`, { defaultValue: entry.label }) };
}
