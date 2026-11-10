import { NextResponse, type NextRequest } from 'next/server';

import {
  LANGUAGE_COOKIE,
  LANGUAGE_HEADER,
  asLanguage,
  splitLocale,
} from '@/lib/language';

/**
 * Puts the language in the URL, the way the handbook does.
 *
 * Two directions:
 *
 *   `/fr/members`  is rewritten to `/members` with the language in a header,
 *                  so every route keeps its own file and no page had to move
 *                  under a `[locale]` segment. A thousand `href="/members"`
 *                  stay correct.
 *
 *   `/members`     is redirected to `/fr/members` when the reader has chosen
 *                  a language, so the address bar keeps showing it after an
 *                  ordinary in-app navigation rather than quietly dropping
 *                  back to the unprefixed form.
 *
 * English is the unprefixed form and is never redirected, so existing links
 * and bookmarks keep working exactly as they did.
 *
 * A reader on 'system' is left alone too: they never named a language, so
 * there is nothing to put in the URL, and forcing one would turn a browser
 * default into a choice they did not make.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hit = splitLocale(pathname);

  if (hit) {
    const url = req.nextUrl.clone();
    url.pathname = hit.rest;

    const headers = new Headers(req.headers);
    headers.set(LANGUAGE_HEADER, hit.locale);

    const res = NextResponse.rewrite(url, { request: { headers } });
    // The URL wins over whatever was stored. Someone opening a shared French
    // link should get French, not the language their last visit left behind,
    // and the cookie has to follow or the next unprefixed request would
    // bounce them straight back out of it.
    if (req.cookies.get(LANGUAGE_COOKIE)?.value !== hit.locale) {
      res.cookies.set(LANGUAGE_COOKIE, hit.locale, {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
      });
    }
    return res;
  }

  const stored = req.cookies.get(LANGUAGE_COOKIE)?.value;
  if (stored && stored !== 'system') {
    const lang = asLanguage(stored);
    if (lang !== 'en') {
      const url = req.nextUrl.clone();
      url.pathname = pathname === '/' ? `/${lang}` : `/${lang}${pathname}`;
      return NextResponse.redirect(url);
    }
  }

  const headers = new Headers(req.headers);
  headers.set(LANGUAGE_HEADER, 'en');
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything a person reads, and nothing else: not the RSC and build
  // payloads under /_next, not the API, and not a file with an extension.
  // A redirect on any of those breaks the asset rather than relocating it.
  matcher: ['/((?!_next/|api/|.*\\..*).*)'],
};
