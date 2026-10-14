#!/usr/bin/env python3
"""Move user-visible strings in a React/React Native file into t() calls.

    python3 tools/i18n-audit/extract.py <file> <namespace>

Prints a JSON object of key -> English so the catalogue can be assembled.

Three rules keep it from breaking code, each learned by breaking some:

  1. Only rewrite inside a component body. A `label:` in a module-level
     constant map would compile to a t() call at module scope, where no hook
     has run. Those are left alone and stay visible to the audit as work
     remaining.
  2. Never rewrite a bare quoted string in an array or object value. Those are
     often data bound for the API: translating a relationship or a gender
     would write French into the database.
  3. Anchor the new import after the last complete import. Matching only the
     first line lands inside a multi-line `import { ... }` and is a syntax
     error rather than a bad string.
"""
import json
import re
import sys


def _ns_list(ns):
    """The namespace list for useTranslation, without a duplicate 'common'."""
    return f"['{ns}']" if ns == 'common' else f"['{ns}', 'common']"


PROPS = ('label|placeholder|title|accessibilityLabel|accessibilityHint|subtitle'
         '|heading|helper|hint|emptyText|emptyLabel|confirmLabel|cancelLabel|submitLabel')
FIELDS = ('title|message|label|subtitle|placeholder|confirmLabel|cancelLabel'
          '|emptyLabel|helper|hint|heading|description|helperText|emptyText'
          '|confirmText|cancelText|tooltip|caption')

SKIP = re.compile(r'^(?:[A-Z]{1,4}|\d+|[^A-Za-z]*|https?:.*|[a-z]+://.*)$')
CODEISH = re.compile(r'[;()\[\]=]|=>|&&|\|\||\breturn\b|\bconst\b|\.\w+\(')
JSX_TEXT = r'(?<![=!<>|&-])>\s*([A-Za-z][^<>{}]{1,300}?)\s*<'

# Only the head of a declaration. The parameter list cannot be matched with a
# regex: a destructured prop type routinely contains its own parentheses, as in
# `onPick: (kind: Scope) => void`, so the parens are balanced by hand below.
DECL_HEAD = re.compile(
    r'^(?:export\s+)?(?:default\s+)?function ([A-Z]\w*)\s*\('
    r'|^(?:export\s+)?const ([A-Z]\w*)\s*(?::[^=\n]*)?=\s*\(',
    re.M)


def key_for(text, used):
    words = re.findall(r'[A-Za-z]+', text)[:6]
    if not words:
        return None
    k = (words[0].lower() + ''.join(w.capitalize() for w in words[1:]))[:44] or 'text'
    base, n = k, 2
    while k in used:
        k, n = f'{base}{n}', n + 1
    used.add(k)
    return k


def clean(raw):
    t = re.sub(r'\s+', ' ', raw).strip()
    for a, b in (('&apos;', "'"), ('&quot;', '"'), ('&amp;', '&'),
                 ('&nbsp;', ' '), ('&ldquo;', '"'), ('&rdquo;', '"')):
        t = t.replace(a, b)
    return t


def _body_start(src, open_paren):
    """Index just after the `{` that opens the body, or None."""
    depth, i = 0, open_paren
    while i < len(src):
        if src[i] == '(':
            depth += 1
        elif src[i] == ')':
            depth -= 1
            if depth == 0:
                break
        i += 1
    else:
        return None
    brace = src.find('{', i)
    return brace + 1 if brace != -1 else None


def _body_end(src, body_start):
    """Index of the matching closing brace for a body that starts at body_start."""
    depth, i = 1, body_start
    while i < len(src) and depth:
        c = src[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
        i += 1
    return i


def component_decls(src):
    """(head_start, body_start, body_end) for each component, in file order."""
    out = []
    for m in DECL_HEAD.finditer(src):
        start = _body_start(src, m.end() - 1)
        if start is not None:
            out.append((m.start(), start, _body_end(src, start)))
    return out


def component_ranges(src):
    """Each component body, bounded by its own closing brace.

    Running to the next declaration instead would swallow module-level
    constants declared between two components, and a `label:` in one of those
    becomes a t() call at module scope.
    """
    return [(body, end) for _, body, end in component_decls(src)]


def main():
    path, ns = sys.argv[1], sys.argv[2]
    src = open(path).read()
    ranges = component_ranges(src)

    def inside(pos):
        return any(a <= pos < b for a, b in ranges)

    used, out, edits = set(), {}, []

    def remember(text):
        t = clean(text)
        if len(t) < 2 or SKIP.match(t) or not re.search(r'[A-Za-z]{2}', t):
            return None
        for k, v in out.items():
            if v == t:
                return k
        k = key_for(t, used)
        if k:
            out[k] = t
        return k

    def collect(pattern, build, group=2, flags=0, guard=False):
        for m in re.finditer(pattern, src, flags):
            if not inside(m.start()):
                continue
            body = m.group(group)
            if guard and CODEISH.search(body):
                continue
            k = remember(body)
            if k:
                edits.append((m.start(), m.end(), build(m, k)))

    collect(rf'\b({PROPS})="([^"{{}}<>]{{2,160}})"',
            lambda m, k: f"{m.group(1)}={{t('{ns}:{k}')}}")
    collect(rf"\b({FIELDS}): '([^'\\\n]{{2,160}})'",
            lambda m, k: f"{m.group(1)}: t('{ns}:{k}')")
    collect(JSX_TEXT, lambda m, k: f">{{t('{ns}:{k}')}}<",
            group=1, flags=re.S, guard=True)

    # Positions the JSX scan cannot see. Each of these was shipping English in
    # every language because it lives in an expression, not in markup.

    # Toasts and native confirms.
    collect(r"(toast\.(?:success|error|info|warning|message)\(\s*)'([^'\\\n]{4,200})'",
            lambda m, k: f"{m.group(1)}t('{ns}:{k}')", group=2)
    collect(r"(window\.confirm\(\s*)'([^'\\\n]{4,300})'",
            lambda m, k: f"{m.group(1)}t('{ns}:{k}')", group=2)

    # Both arms of a ternary. The audit only looked for a capitalised first
    # letter, which missed every lowercase fragment -- "in a row, attended".
    for m in re.finditer(r"\?\s*'([^'\\\n]{3,200})'\s*:\s*'([^'\\\n]{3,200})'", src):
        if not inside(m.start()):
            continue
        ka, kb = remember(m.group(1)), remember(m.group(2))
        if ka and kb:
            edits.append((m.start(), m.end(), f"? t('{ns}:{ka}') : t('{ns}:{kb}')"))

    # `err instanceof Error ? err.message : 'Could not load X.'` -- the branch
    # a reader actually hits when the server is down.
    collect(r"(:\s*)'([A-Z][^'\\\n]{6,200}[.!?])'(\s*[,)\n])",
            lambda m, k: f"{m.group(1)}t('{ns}:{k}'){m.group(3)}", group=2)

    if edits:
        for start, end, text in sorted(edits, key=lambda e: -e[0]):
            src = src[:start] + text + src[end:]

        if 'useTranslation' not in src:
            imports = list(re.finditer(r'^import\s[\s\S]*?;[ \t]*\n', src, re.M))
            if not imports:
                print(json.dumps({'__error__': 'no imports to anchor to'}))
                return
            at = imports[-1].end()
            src = src[:at] + "import { useTranslation } from 'react-i18next';\n" + src[at:]

        decls = component_decls(src)
        for i in range(len(decls) - 1, -1, -1):
            start, end = decls[i][1], decls[i][2]
            body = src[start:end]
            if ("t('" in body or 't(`' in body) and 'useTranslation(' not in body:
                src = (src[:start]
                       # 'common' is the fallback namespace, so listing it
                       # twice for a file that already lives in it is noise.
                       + f"  const {{ t }} = useTranslation({_ns_list(ns)});\n"
                       + src[start:])
        open(path, 'w').write(src)

    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
