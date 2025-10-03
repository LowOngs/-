#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
blogger_validator_updated.py
Blogger XML template linter + auto-fixer.

Usage:
  python blogger_validator_updated.py INPUT.xml            # validate only
  python blogger_validator_updated.py INPUT.xml --fix OUT.xml  # validate + fix (iterative)
"""

import sys, re, hashlib

VOID_TAGS = ("img","br","hr","input","meta","link","source","base","area","col","embed","param","track","wbr")
AMP_KEYS  = ("id","export","text","tl","sk","tk","st")

NS_REQUIRED = {
    'xmlns="http://www.w3.org/1999/xhtml"': re.compile(r'xmlns="https?://www\.w3\.org/1999/xhtml"', re.I),
    'xmlns:b="http://www.google.com/2005/gml/b"': re.compile(r'xmlns:b="https?://www\.google\.com/2005/gml/b"', re.I),
    'xmlns:data="http://www.google.com/2005/gml/data"': re.compile(r'xmlns:data="https?://www\.google\.com/2005/gml/data"', re.I),
    'xmlns:expr="http://www.google.com/2005/gml/expr"': re.compile(r'xmlns:expr="https?://www\.google\.com/2005/gml/expr"', re.I),
}

def digest(s): return hashlib.sha256(s.encode('utf-8','ignore')).hexdigest()[:8]

def load_text(p):
    return Path(p).read_text(encoding="utf-8", errors="replace")

def save_text(p, s):
    Path(p).write_text(s, encoding="utf-8")

def replace_ns(s):
    before = s
    for good, pat in NS_REQUIRED.items():
        s = pat.sub(good, s)
    return s, ("namespaces" if s!=before else None)

def escape_ampersands(s):
    before = s
    # avoid double &amp;amp;
    s = s.replace("&amp;amp;", "&amp;")
    # Replace &key= with &amp;key= inside attributes
    for k in AMP_KEYS:
        s = re.sub(rf'(&){k}=', rf'&amp;{k}=', s)
    return s, ("ampersands" if s!=before else None)

def self_close_voids(s):
    before = s
    for t in VOID_TAGS:
        # turn <tag ...> to <tag ... />
        s = re.sub(rf'<{t}(\s[^<>]*?)?>', lambda m: m.group(0)[:-1] + " />" if not m.group(0).rstrip().endswith("/>") else m.group(0), s, flags=re.I)
    return s, ("voids" if s!=before else None)

def fix_error_page_cond(s):
    before = s
    # <b:if cond="data:blog.pageType == "error_page"">  -> single quoted + &quot;
    s = re.sub(r'(<b:if\s+[^>]*cond=)"\s*data:blog\.pageType\s*==\s*"error_page"\s*(")',
               r"\1'data:blog.pageType == &quot;error_page&quot;'\2", s, flags=re.I)
    # any attribute containing == "error_page"
    def repl_attr(m):
        part = m.group(0)
        return part.replace('== "error_page"', '== &quot;error_page&quot;')
    s = re.sub(r'="[^"]*?==\s*"error_page"[^"]*?"', repl_attr, s)
    return s, ("error_page_cond" if s!=before else None)

def wrap_script_cdata(s):
    before = s
    out = []
    i = 0
    while True:
        m = re.search(r'(?is)<script[^>]*>', s[i:])
        if not m:
            out.append(s[i:]); break
        a = i + m.start(); b = i + m.end()
        out.append(s[i:a]); out.append(s[a:b])
        close = s.find("</script>", b)
        if close == -1:
            out.append(s[b:]); break
        body = s[b:close]
        if "<![CDATA[" not in body:
            out.append("<![CDATA["); out.append(body); out.append("]]>")
        else:
            out.append(body)
        out.append("</script>")
        i = close + len("</script>")
    res = "".join(out)
    return res, ("script_cdata" if res!=before else None)

def strip_strange_spaces(s):
    before = s
    s = s.replace("\u00A0","").replace("\u200B","").replace("\u200C","").replace("\u200D","").replace("\uFEFF","")
    # fix split tags like <d ata:, <b : etc
    s = re.sub(r"<d\s+ata:", "<data:", s, flags=re.I)
    s = re.sub(r"<\/d\s+ata:", "</data:", s, flags=re.I)
    s = re.sub(r"<b\s+:", "<b:", s, flags=re.I)
    s = re.sub(r"<expr\s+:", "<expr:", s, flags=re.I)
    s = re.sub(r"<data\s+:", "<data:", s, flags=re.I)
    return s, ("unicode_spaces" if s!=before else None)

def ensure_core_blocks(s):
    issues = []
    if 'name="all-head-content"' not in s:
        issues.append("missing <b:include name='all-head-content'> in <head>")
    if '<b:widget id="Blog1" type="Blog"' not in s:
        issues.append("missing Blog1 widget")
    if "xmlns=" not in s or "xmlns:b=" not in s:
        issues.append("missing required namespaces")
    return issues

def check_widget_ids(s):
    issues = []
    # BlogSearch must be id BlogSearch\d*
    bad_search = re.findall(r"<b:widget\s+id=['\"]Search(\d+)['\"]\s+type=['\"]Search['\"]", s, re.I)
    if bad_search:
        issues.append("invalid BlogSearch widget id(s): " + ", ".join(bad_search))
    # BlogArchive id must be BlogArchive\d*
    bad_arch = re.findall(r"<b:widget\s+id=['\"]Archive(\d+)['\"]\s+type=['\"]BlogArchive['\"]", s, re.I)
    if bad_arch:
        issues.append("invalid BlogArchive widget id(s): " + ", ".join(bad_arch))
    return issues

def validate_only(s):
    errs = []
    # 1) stray &id=
    if re.search(r'(?<!&amp;)&(id|export|text|tl|sk|tk|st)=', s):
        errs.append("found unescaped & in query strings")
    # 2) void tags not self-closed
    for t in VOID_TAGS:
        if re.search(rf'<{t}[^/>]*?>', s, re.I):
            pass  # can't be sure—auto-fix step handles it
    # 3) error_page cond
    if re.search(r'cond="[^"]*==\s*"error_page"', s, re.I):
        errs.append('invalid quoting in error_page condition')
    # 4) <d... tag
    if re.search(r"<d(?=[^a-zA-Z:])", s):
        errs.append("suspicious '<d' token; likely split <data:> or script needs CDATA")
    # 5) namespaces
    for pat in NS_REQUIRED.values():
        if pat.search(s):
            errs.append("namespace uses https://; must be http://")
    # 6) core blocks
    errs += ensure_core_blocks(s)
    # 7) widgets
    errs += check_widget_ids(s)
    return errs

def auto_fix(s, max_rounds=4):
    steps = [
        strip_strange_spaces,
        replace_ns,
        escape_ampersands,
        self_close_voids,
        fix_error_page_cond,
        wrap_script_cdata,
    ]
    history = [digest(s)]
    notes = []
    for _ in range(max_rounds):
        changed = False
        for fn in steps:
            s2, tag = fn(s)
            if s2 != s:
                s = s2; changed = True
                if tag: notes.append(tag)
        if not changed:
            break
        h = digest(s)
        if h in history: break
        history.append(h)
    return s, list(dict.fromkeys(notes))  # unique order-preserving

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    inp = sys.argv[1]
    fix_out = None
    if len(sys.argv) >= 4 and sys.argv[2] == "--fix":
        fix_out = sys.argv[3]

    src = load_text(inp)
    errs_before = validate_only(src)

    if not fix_out:
        if errs_before:
            print("FAILED")
            for e in errs_before: print("-", e)
            sys.exit(1)
        else:
            print("OK")
            sys.exit(0)

    # fix path
    fixed, notes = auto_fix(src)
    errs_after = validate_only(fixed)

    save_text(fix_out, fixed)
    print("Fix notes:", ", ".join(notes) if notes else "(none)")
    if errs_after:
        print("RECHECK: FAILED")
        for e in errs_after: print("-", e)
        sys.exit(1)
    else:
        print("RECHECK: OK")
        sys.exit(0)

if __name__ == "__main__":
    main()
