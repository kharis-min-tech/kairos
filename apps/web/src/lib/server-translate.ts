import { cookies, headers } from 'next/headers';

import en from '../../locales/en.json';
import fr from '../../locales/fr.json';
import kri from '../../locales/kri.json';
import tw from '../../locales/tw.json';
import {
  LANGUAGE_COOKIE,
  LANGUAGE_HEADER,
  asLanguage,
  type LanguageCode,
} from '@/lib/language';

/**
 * A `t()` for `generateMetadata`, which runs on the server and so cannot use
 * the react-i18next hook.
 *
 * Page titles and descriptions are as user-facing as anything on the page —
 * they are the browser tab, the bookmark and the link preview — but they are
 * declared in a server component, so they stayed English in every language
 * while the body around them translated.
 *
 * Reads the same cookie the root layout reads, so the tab title and the page
 * agree. A missing key falls back to English rather than rendering a key path.
 */
const CATALOGUES: Record<LanguageCode, Record<string, Record<string, string>>> = {
  en: en as never,
  fr: fr as never,
  kri: kri as never,
  tw: tw as never,
};

export async function serverTranslator(): Promise<
  (key: string, fallback: string) => string
> {
  // Same order of authority as the root layout, so the tab title cannot
  // disagree with the page underneath it: the path first, then the cookie.
  const fromPath = (await headers()).get(LANGUAGE_HEADER);
  const store = await cookies();
  const lang = fromPath
    ? asLanguage(fromPath)
    : asLanguage(store.get(LANGUAGE_COOKIE)?.value);
  return (key, fallback) => {
    const [ns, path] = key.split(':');
    if (!ns || !path) return fallback;
    const lookup = (code: LanguageCode) => CATALOGUES[code]?.[ns]?.[path];
    return lookup(lang) || lookup('en') || fallback;
  };
}
