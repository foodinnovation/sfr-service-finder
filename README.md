# SFR service finder

The services page of swissfoodresearch.ch, in German, French and English. Visitors pick the question they face and see the services that fit, with all services listed below.

- Live: https://foodinnovation.github.io/sfr-service-finder/ (add `?lang=fr` or `?lang=en`)
- Preview as embedded on the website, with language and phone-width switches: https://foodinnovation.github.io/sfr-service-finder/preview.html
- Built on the SFR Design System 2026: Funnel Sans, the design-system icons and the pillar colours.
- The master for every text is the **SFR Service Catalogue 2027** (Claude doc). Change a service there first, then here.

## Where things are

| What | File |
| --- | --- |
| Texts in German, French, English | `content/de.json`, `content/fr.json`, `content/en.json` |
| Which services exist, their pillar, icon, member advantage, pilot flag, links and next step; the six questions and the services each shows; the overview columns | `content/structure.json` |
| Links (membership, coaching, forms) per language | `links` in each language file |
| Page, layout and behaviour | `index.html`, `assets/style.css`, `assets/app.js` |
| Icons and fonts | `assets/icons/`, `assets/fonts/` |

No prices appear on the website (decision of 23 November 2026). Services where members get better terms carry `"member_advantage": true` in `structure.json`.

## How to change something

Edit the file on GitHub (pencil icon) and commit to `main`. The workflow **Check and publish** then:

1. checks that the three language files have the same entries and that every service, question, link and icon exists;
2. opens the page in a headless browser in DE, FR and EN, on desktop and mobile, clicks every question and every service, and stops if anything fails to load or a price appears;
3. publishes to GitHub Pages, usually within two minutes.

If the check fails, nothing is published and the last good version stays online. The run's screenshots are kept for 30 days under its artifacts.

Typical changes:

- **Reword a service:** edit its entry under `services` in all three language files.
- **Add a service:** add it to `services` and to one `overview` column in `structure.json` (and to a question if it fits), give it texts in all three language files, and add its icon to `assets/icons/` if it is new.
- **Change which services answer a question:** edit `questions` in `structure.json`; the first service is shown as the best match.

## Settings it depends on

- Settings > Pages > Source: **GitHub Actions**.

## The block in Django

Paste once into an HTML element on the services page of each language. It reads the page's language and sizes the frame to its content.

```html
<iframe id="sfr-service-finder" title="Services" loading="lazy" style="width:100%;height:2600px;border:0;display:block"></iframe>
<script>(function(){var f=document.getElementById("sfr-service-finder"),l=(document.documentElement.lang||"de").slice(0,2);f.src="https://foodinnovation.github.io/sfr-service-finder/?lang="+(["de","fr","en"].indexOf(l)>-1?l:"de");window.addEventListener("message",function(e){if(e.origin!=="https://foodinnovation.github.io"||!e.data||!e.data.sfrServiceFinder)return;var m=e.data.sfrServiceFinder;if(m.height)f.style.height=m.height+"px";if(m.scrollTo!=null)window.scrollTo({top:f.getBoundingClientRect().top+window.scrollY+m.scrollTo-80,behavior:"smooth"})})})();</script>
```

If the Django page carries no `lang` attribute, replace `(document.documentElement.lang||"de")` with the page's language, for example `"fr"`.

## Open points

- French texts: drafted from the German; to be read by a native French speaker before going live.
- French link for the Innovation Groups page: currently points to the English page.
