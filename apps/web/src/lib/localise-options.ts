/**
 * Swap the English label on a `{ value, label }` option for its catalogue
 * entry, keyed by the option's `value`.
 *
 * Option lists are declared at module scope, where there is no `t` to call, so
 * the English sits in the constant and the translation happens at the render
 * site. `value` is untouched: it is what the form submits and the API stores.
 *
 * An option with no catalogue entry keeps its English label rather than
 * rendering a key path, so adding a new option never breaks the UI before its
 * translations land.
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

export function localiseOptions<T extends { value: string; label: string }>(
  t: Translate,
  prefix: string,
  options: readonly T[],
): T[] {
  return options.map((o) => ({
    ...o,
    label: t(`${prefix}${keySlug(o.value)}`, { defaultValue: o.label }),
  }));
}
