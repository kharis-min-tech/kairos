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

# A single token with no spaces is an identifier, not a sentence: an API
# status, a scope kind, an <input type>. A Tailwind class list is several
# tokens but every one of them is a utility class. Both have been translated
# by accident, and a translated value silently breaks the comparison it feeds.
VALUEISH = re.compile(
    r'^[a-z0-9_-]+$'                       # in_person, welfare, password
    r'|^[A-Z][a-z]*(?:_[A-Za-z]+)*$'        # Open, Assigned, Not_Present
    r'|(?:^|\s)(?:bg|text|border|hover|dark|ring|from|to|via|w|h|p[xytblr]?|m[xytblr]?|flex|grid|rounded|gap|opacity|shadow)[-:]'
    r'|^#[0-9a-fA-F]{3,8}$'
)


def is_prose(text):
    """True when a string reads as something written for a person."""
    if VALUEISH.search(text):
        return False
    words = re.findall(r"[A-Za-z][A-Za-z'’-]*", text)
    if len(words) >= 2:
        return True
    # A single word still counts if it is a real word shown on its own.
    return len(words) == 1 and len(words[0]) >= 5 and text.strip() == words[0]
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
    # Optional third argument: a JSON file of the namespace's existing
    # catalogue. Without it a generated key can land on one that already
    # holds different English, which rewords the screen rather than
    # translating it -- a "Retry" button once started reading "Try again".
    taken = {}
    if len(sys.argv) > 3 and sys.argv[3]:
        taken = json.load(open(sys.argv[3]))
    src = open(path).read()
    ranges = component_ranges(src)

    def inside(pos):
        return any(a <= pos < b for a, b in ranges)

    used, out, edits = set(), {}, []

    def claim(start, end):
        """Refuse a second rewrite of a span an earlier rule already took.

        `description: 'Sentence.'` matches both the display-prop rule and the
        error-fallback rule. Both edits were applied, and the second one ate
        the tail of the first, leaving a syntax error in the file.
        """
        for a, b, _ in edits:
            if start < b and a < end:
                return False
        return True

    def remember(text):
        t = clean(text)
        if len(t) < 2 or SKIP.match(t) or not re.search(r'[A-Za-z]{2}', t):
            return None
        for k, v in out.items():
            if v == t:
                return k
        for k, v in taken.items():
            if v == t:
                return k
        k = key_for(t, used | {k for k, v in taken.items() if v != t})
        if k:
            out[k] = t
        return k

    # A line (or the line above it) carrying `i18n-ignore` is left alone.
    # Some display props are load-bearing values -- the souls board compares
    # its RAG filter against the chip's own `label` -- and the only thing that
    # knows is the person who wrote it.
    # `i18n-ignore` covers that line and the next one; `i18n-ignore(6)` covers
    # the next six, which is what a short block of option objects needs.
    ignored_lines = set()
    for i, line in enumerate(src.split('\n')):
        hit = re.search(r'i18n-ignore(?:\((\d+)\))?', line)
        if hit:
            span = int(hit.group(1) or 1)
            ignored_lines.update(range(i + 1, i + 2 + span))

    def line_of(pos):
        return src.count('\n', 0, pos) + 1

    def collect(pattern, build, group=2, flags=0, guard=False, prose=False):
        for m in re.finditer(pattern, src, flags):
            if not inside(m.start()) or line_of(m.start()) in ignored_lines:
                continue
            body = m.group(group)
            if guard and CODEISH.search(body):
                continue
            if prose and not is_prose(clean(body)):
                continue
            if not claim(m.start(), m.end()):
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
            lambda m, k: f"{m.group(1)}t('{ns}:{k}')", group=2, prose=True)
    collect(r"(window\.confirm\(\s*)'([^'\\\n]{4,300})'",
            lambda m, k: f"{m.group(1)}t('{ns}:{k}')", group=2, prose=True)

    # Both arms of a ternary. The audit only looked for a capitalised first
    # letter, which missed every lowercase fragment -- "in a row, attended".
    #
    # A ternary is the most dangerous position in the file, because the two
    # arms are just as often a value as a label: an <input type>, an API
    # status, a scope kind, a Tailwind class. `PROSE` insists on something
    # that reads like English prose -- two words, or one word of 5+ letters
    # with a space or punctuation around it -- and `VALUEISH` vetoes anything
    # that smells like an identifier or a class list.
    for m in re.finditer(r"\?\s*'([^'\\\n]{3,200})'\s*:\s*'([^'\\\n]{3,200})'", src):
        if not inside(m.start()):
            continue
        a, b = clean(m.group(1)), clean(m.group(2))
        if not (is_prose(a) and is_prose(b)):
            continue
        if not claim(m.start(), m.end()):
            continue
        ka, kb = remember(a), remember(b)
        if ka and kb:
            edits.append((m.start(), m.end(), f"? t('{ns}:{ka}') : t('{ns}:{kb}')"))

    # `err instanceof Error ? err.message : 'Could not load X.'` -- the branch
    # a reader actually hits when the server is down.
    collect(r"(:\s*)'([A-Z][^'\\\n]{6,200}[.!?])'(\s*[,)\n])",
            lambda m, k: f"{m.group(1)}t('{ns}:{k}'){m.group(3)}", group=2, prose=True)

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
