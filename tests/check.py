"""Checks the service finder before it is published.

1. The three language files have exactly the same keys, and every service and
   question in structure.json has its texts in every language.
2. Every icon named in structure.json exists.
3. The page opens in a headless browser in DE, FR and EN without errors, every
   question and every service can be clicked, and no price appears.

Run: python tests/check.py   (needs: pip install playwright && python -m playwright install chromium)
"""
import functools, http.server, json, pathlib, re, sys, threading

ROOT = pathlib.Path(__file__).resolve().parent.parent
LANGS = ["de", "fr", "en"]
errors = []


def keys(obj, prefix=""):
    if isinstance(obj, dict):
        out = set()
        for k, v in obj.items():
            out |= {prefix + k} | keys(v, prefix + k + ".")
        return out
    if isinstance(obj, list):
        return {prefix + "[" + str(len(obj)) + "]"}
    return set()


structure = json.loads((ROOT / "content/structure.json").read_text())
content = {l: json.loads((ROOT / f"content/{l}.json").read_text()) for l in LANGS}

base = keys(content["de"])
for l in LANGS[1:]:
    k = keys(content[l])
    for miss in sorted(base - k):
        errors.append(f"{l}.json lacks {miss} (present in de.json)")
    for extra in sorted(k - base):
        errors.append(f"{l}.json has {extra}, which de.json lacks")

services = structure["services"]
for l in LANGS:
    for s in services:
        if s not in content[l]["services"]:
            errors.append(f"{l}.json has no texts for service '{s}'")
    for q in structure["questions"]:
        if q["id"] not in content[l]["questions"]:
            errors.append(f"{l}.json has no texts for question '{q['id']}'")
        for s in q["services"]:
            if s not in services:
                errors.append(f"question '{q['id']}' names unknown service '{s}'")
    for key, s in services.items():
        if s.get("link") and s["link"] not in content[l]["links"]:
            errors.append(f"service '{key}' uses link '{s['link']}', missing in {l}.json")
        if s.get("next") and s["next"] not in services:
            errors.append(f"service '{key}' points to unknown next step '{s['next']}'")
listed = [s for col in structure["overview"] for s in col["services"]]
if sorted(listed) != sorted(services):
    errors.append("the overview must list every service exactly once")
for key, s in services.items():
    if not (ROOT / "assets/icons" / (s["icon"] + ".svg")).exists():
        errors.append(f"icon assets/icons/{s['icon']}.svg for '{key}' is missing")
if errors:
    print("\n".join("FAIL " + e for e in errors))
    sys.exit(1)

# browser check
from playwright.sync_api import sync_playwright

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{server.server_address[1]}/index.html"

with sync_playwright() as p:
    browser = p.chromium.launch()
    for l in LANGS:
        for width in (1440, 390):
            page = browser.new_page(viewport={"width": width, "height": 900})
            page_errors = []
            page.on("pageerror", lambda e: page_errors.append(str(e)))
            page.on("requestfailed", lambda r: page_errors.append("failed to load " + r.url))
            page.on("response", lambda r: page_errors.append(f"{r.status} for {r.url}") if r.status >= 400 else None)
            page.goto(f"{url}?lang={l}")
            page.wait_for_selector("#sfr-service-finder[data-ready]", timeout=10000)
            seen = ""
            for q in structure["questions"]:
                page.click(f'[data-q="{q["id"]}"]')
                seen += page.inner_text("#sfr-service-finder")
            for s in services:
                page.click(f'.row[data-svc="{s}"]')
                panel = page.inner_text(".panel")
                if content[l]["services"][s]["title"] not in panel:
                    errors.append(f"{l} {width}px: clicking '{s}' does not open its details")
                seen += panel
            for m in re.finditer(r"CHF ?\d[\d']*", seen):
                around = seen[max(0, m.start() - 60): m.end() + 60]
                if not re.search(r"Booster|39'000", around):
                    errors.append(f"{l} {width}px: a price appears on the page: ...{around.strip()}...")
            if page.locator(".ic").count() == 0:
                errors.append(f"{l} {width}px: no icons shown")
            errors += [f"{l} {width}px: {e}" for e in page_errors]
            if width == 1440:
                page.screenshot(path=str(ROOT / f"check-{l}.png"), full_page=True)
            page.close()
    browser.close()
server.shutdown()

if errors:
    print("\n".join("FAIL " + e for e in sorted(set(errors))))
    sys.exit(1)
print(f"OK: {len(services)} services, {len(structure['questions'])} questions, languages {', '.join(LANGS)}")
