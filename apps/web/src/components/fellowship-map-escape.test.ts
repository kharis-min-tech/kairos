import { describe, it, expect } from 'vitest';
import { escapeHtml } from './fellowship-map';

/**
 * The Mapbox popups on the fellowship map are built as HTML strings and handed
 * to `popup.setHTML()`, which does no escaping of its own. Fellowship names
 * and descriptions are written by fellowship leaders and branch admins, so
 * before this they were a stored XSS: a fellowship named
 * `<img src=x onerror=...>` ran in the browser of every member who opened the
 * map, carrying that member's session.
 *
 * CodeQL reported the old code as `js/incomplete-sanitization`. The escaping
 * that existed was a `.replace(/'/g, ...)` on an inline `onclick` payload —
 * both the wrong character set and the wrong layer, since HTML attribute
 * parsing happens before the JS is parsed.
 */
describe('escapeHtml', () => {
  it('neutralises a script tag', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('neutralises the img/onerror payload that works without script tags', () => {
    const out = escapeHtml('<img src=x onerror=alert(document.cookie)>');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
  });

  it('escapes both quote characters, so an attribute cannot be closed early', () => {
    // The old code escaped only the single quote. Both matter: the popup
    // interpolates into double-quoted attributes as well.
    expect(escapeHtml(`" onmouseover="alert(1)`)).toBe(
      '&quot; onmouseover=&quot;alert(1)',
    );
    expect(escapeHtml(`' onmouseover='alert(1)`)).toBe(
      '&#39; onmouseover=&#39;alert(1)',
    );
  });

  it('escapes the ampersand first, so entities are not double-decoded', () => {
    // If `&` were escaped last it would re-encode the entities this function
    // has just written, and `&lt;` would arrive as `&amp;lt;` — visible as
    // literal text to the user, and a sign the order is wrong.
    expect(escapeHtml('&lt;script&gt;')).toBe('&amp;lt;script&amp;gt;');
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('leaves ordinary fellowship names untouched', () => {
    expect(escapeHtml('Belvedere Young Adults')).toBe('Belvedere Young Adults');
    expect(escapeHtml('Men of Valour — Thursdays')).toBe('Men of Valour — Thursdays');
  });

  it('renders null and undefined as empty, not as the strings "null"/"undefined"', () => {
    // `meetingSchedule` and `description` are both nullable on the API type.
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('coerces non-strings rather than throwing', () => {
    expect(escapeHtml(0)).toBe('0');
    expect(escapeHtml(false)).toBe('false');
  });
});
