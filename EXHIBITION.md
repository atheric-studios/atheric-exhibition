# EXHIBITION — what this repository is

This repository is the **public exhibition copy** of the source behind
[atheric.eu](https://atheric.eu). It exists so the site's colophon line —
*"read the source on github — published for transparency, not for
redistribution"* — resolves to something real and current.

## The survey

| Path | Role | Provenance |
| --- | --- | --- |
| `index.html` | the home document — hero, broadsheet, inline SVG artifacts | mirrored |
| `thought.html` | the theses + the author's note, served at `/thought` | mirrored |
| `privacy.html` | privacy notice + imprint, served at `/privacy` | mirrored |
| `404.html` | not-found sheet | mirrored |
| `_headers` | CSP, security headers, immutable-caching rules (Cloudflare Pages) | mirrored |
| `robots.txt` · `sitemap.xml` · `og.jpg` | crawl + share surface | mirrored |
| `fonts/` (44 woff2) | self-hosted brand type; the five referenced files are subset/deduped variable fonts, the rest are the original mirror kept for rollback | mirrored |
| `src/styles/` (7 css) | tokens, ground, hero (locked), broadsheet, crystallisation, craft study | mirrored |
| `src/scripts/` (7 js) | shader + adapter (locked material), blob lifecycle, hero, broadsheet behaviours, craft study, thought page | mirrored |
| `docs/DESIGN.md` | the design law: every mechanism, measurement, and trap, per pass | **exhibition-owned** (canonical home) |
| `docs/generators/gen-cabinet-shards.js` | seeded generator for the cabinet casting SVGs (the committed polygons are its artifact) | **exhibition-owned** (canonical home) |
| `LICENSE` | source-visible licence (YDT Holdings Oy) | exhibition-owned |
| `README.md` · `EXHIBITION.md` | this survey | exhibition-owned |

## The sync law

- The mirrored set is a **tree snapshot** of the private working repo's
  `main` branch — the exact files atheric.eu serves, nothing else.
  **Git history is never mirrored** (the working history contains
  internal documents that were removed from the tree).
- Exhibition-owned files (`docs/`, `LICENSE`, `README.md`,
  `EXHIBITION.md`) live only here and survive every sync.
- The working repo's `.gitignore` and `.github/` are not mirrored —
  the ignore file excludes `docs/` there (a deploy-branch concern, while
  `docs/` is committed here) and `.github/` holds the sync workflow
  itself.
- Each sync commit names the source commit:
  `mirror: home-v2 @ <sha> — <subject>`.

## Reading order

1. `docs/DESIGN.md` — the design law, written pass by pass as the site
   was built. Start at "The premise: the chrome cools".
2. `src/scripts/chrome-blob.js` — the shader (the fragment source is a
   template literal; the craft study quotes it verbatim in the page).
3. `src/scripts/body.js` §2b — the crystallisation renderer.
4. `docs/generators/gen-cabinet-shards.js` — how the castings were cut.

Tagged **v2.0.0**, 2026-07-06; synced since. Site: <https://atheric.eu> · Works:
<https://gym.atheric.eu> · <https://under.atheric.eu> · Contact:
<hello@atheric.eu>

— Atheric · MMXXVI
