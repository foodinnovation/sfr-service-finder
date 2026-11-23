"""Builds the crawlable versions of the service finder from the same content files.

Output (into the folder given as argument, default: site/):
  static/de.html, static/fr.html, static/en.html
      HTML fragment per language: every service as plain text, grouped by pillar,
      plus schema.org JSON-LD. Meant to be included server-side by the Django
      services page, under the interactive finder.
  services.jsonld
      The schema.org data for all three languages, for reuse.
  llms.txt
      Plain-text summary of Swiss Food Research and its services for AI tools,
      to be served at https://www.swissfoodresearch.ch/llms.txt.

No prices, internal figures or planned services: the fragments contain only what
the content files contain, and those follow the same rules as the finder.
"""
import html, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "site"
LANGS = ["de", "fr", "en"]
SITE = "https://www.swissfoodresearch.ch"
ORG_ID = SITE + "/#organization"

structure = json.loads((ROOT / "content/structure.json").read_text())
content = {l: json.loads((ROOT / f"content/{l}.json").read_text()) for l in LANGS}
e = html.escape


def service_url(lang, key):
    link = structure["services"][key].get("link")
    return content[lang]["links"].get(link) if link else None


def jsonld(lang):
    c = content[lang]
    offers = []
    for col in structure["overview"]:
        for key in col["services"]:
            t = c["services"][key]
            svc = {
                "@type": "Service",
                "name": t["title"],
                "description": t["line"] + " " + t["blurb"],
                "serviceType": c["pillars"][col["pillar"]],
                "audience": {"@type": "Audience", "audienceType": t["audience"]},
                "provider": {"@id": ORG_ID},
                "areaServed": {"@type": "Country", "name": "Switzerland"},
            }
            url = service_url(lang, key)
            if url:
                svc["url"] = url
            offers.append({"@type": "Offer", "itemOffered": svc})
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": ORG_ID,
        "name": "Swiss Food Research",
        "url": SITE,
        "description": c["about"]["summary"],
        "knowsLanguage": ["de", "fr", "en"],
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": c["about"]["heading"],
            "inLanguage": lang,
            "itemListElement": offers,
        },
    }


def fragment(lang):
    c, a = content[lang], content[lang]["about"]
    out = [f'<section class="sfr-services-text" lang="{lang}" aria-label="{e(a["heading"])}">',
           f'<details><summary>{e(a["toggle"])}</summary>',
           f'<h2>{e(a["heading"])}</h2>', f'<p>{e(a["summary"])}</p>']
    for col in structure["overview"]:
        out.append(f'<h3>{e(c["pillars"][col["pillar"]])}</h3>')
        for key in col["services"]:
            t = c["services"][key]
            out.append("<article>")
            out.append(f'<h4>{e(t["title"])}</h4>')
            out.append(f'<p>{e(t["line"])}</p>')
            out.append(f'<p>{e(t["blurb"])}</p>')
            if t.get("steps"):
                out.append("<ol>" + "".join(f"<li>{e(s)}</li>" for s in t["steps"]) + "</ol>")
            out.append(f'<p>{e(a["for_whom"])}: {e(t["audience"])}</p>')
            url = service_url(lang, key)
            if url:
                out.append(f'<p><a href="{e(url)}">{e(a["more"])}</a></p>')
            out.append("</article>")
    out.append("</details>")
    out.append('<script type="application/ld+json">' + json.dumps(jsonld(lang), ensure_ascii=False) + "</script>")
    out.append("</section>")
    return "\n".join(out) + "\n"


def llms_txt():
    c = content["en"]
    lines = ["# Swiss Food Research", "", "> " + c["about"]["summary"], "",
             "Values: " + ", ".join(v.lower() for v in c["ui"]["values"]) + ". Languages: German, French, English. Website: " + SITE, "",
             "Members get better terms for most services. Membership: " + c["links"]["member"], ""]
    for col in structure["overview"]:
        lines.append("## " + c["pillars"][col["pillar"]])
        lines.append("")
        for key in col["services"]:
            t = c["services"][key]
            url = service_url("en", key)
            lines.append(f"- {t['title']}: {t['line']} For: {t['audience']}." + (f" {url}" if url else ""))
        lines.append("")
    lines += ["## Contact", "", "- Book a one-to-one coaching session: " + c["links"]["coaching"],
              "- Innovation Groups: " + c["links"]["ig"], ""]
    return "\n".join(lines)


(OUT / "static").mkdir(parents=True, exist_ok=True)
for l in LANGS:
    (OUT / "static" / f"{l}.html").write_text(fragment(l))
(OUT / "services.jsonld").write_text(json.dumps({l: jsonld(l) for l in LANGS}, ensure_ascii=False, indent=2))
(OUT / "llms.txt").write_text(llms_txt())
print(f"Built static/{{{','.join(LANGS)}}}.html, services.jsonld, llms.txt in {OUT}")
