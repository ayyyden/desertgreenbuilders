"""
Stamps every local script and stylesheet link in the site's pages with ?v=<version>,
so after an update browsers fetch the new files instead of mixing a new page with an
old cached script (GitHub Pages lets browsers cache files for 10 minutes).

    py tools/bump_version.py        (run before committing changes to JS or CSS)
"""
import os, re, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION = time.strftime("%Y%m%d%H%M")
# src="assets/...js" / href="../assets/...css" (optionally already carrying ?v=...)
PATTERN = re.compile(r'((?:src|href)="(?:/|\.\./)?(?:roofing/)?assets/[^"?]+\.(?:js|css))(?:\?v=[0-9a-z]+)?"')

changed = []
for dirpath, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in (".git", ".claude", "node_modules", "brand", "Before & After")]
    for name in files:
        if not name.endswith(".html"):
            continue
        path = os.path.join(dirpath, name)
        text = open(path, encoding="utf-8").read()
        new = PATTERN.sub(lambda m: m.group(1) + "?v=" + VERSION + '"', text)
        if new != text:
            open(path, "w", encoding="utf-8", newline="").write(new)
            changed.append(os.path.relpath(path, ROOT))
print("version %s stamped in %d pages: %s" % (VERSION, len(changed), ", ".join(changed)))
