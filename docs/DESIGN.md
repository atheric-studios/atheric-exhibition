# DESIGN — the annealing

> **Canonical committed home (2026-07-06):** this file and `generators/` are published in
> [atheric-studios/atheric-exhibition](https://github.com/atheric-studios/atheric-exhibition)
> under `docs/` — the working repo gitignores `docs/`, so this local copy is a convenience
> mirror; commit doc changes to the exhibition (or let the next hand-sync carry them).

> **Current design law.** This supersedes the earlier "permanent-dark · paper objects on the dark
> plane · set light" model (and, before it, the dark→cream *ground inversion* of `docs/SPEC.md` /
> `docs/ARCHITECTURE.md`). The hero is unchanged; **everything after the hero was rebuilt** as the
> cooled-chrome broadsheet described here.

## The premise: the chrome cools

There is one world: a **permanently dark computational plane** (`#050505`) at every scroll
position. The hero is **molten chrome** — the iridescent thin-film blob, alive on the GPU. As the
reader scrolls past, the chrome **sets**, and the body below is read as **the same metal, cooled**:
the studio's **engineering broadsheet**, a machinist's document drawn on the dark plane.

| the hero (molten) | the body (cooled / set) |
| --- | --- |
| liquid, iridescent, alive | measured, exact, at rest |
| the machine | the drawing of what it makes |
| lit by the blob | lit by the annealing light |

This is the bridge line in the markup: *"the chrome is the machine — this is the drawing."*

## The blob is hero-only — it dissolves, it does not pop

The blob is a **hero element**: present behind the hero, then it **sets** (dissolves into black) as
the reader scrolls past, and its render loop shuts down to recover the always-on GPU cost (the
72-step raymarch). Scrolling back restores it cleanly.

The dissolve is **scroll-coupled, in front of the blob, and gradual** — it never pops:

- `src/scripts/main.js` anchors on the **hero `<h1>`** (not the hero box, which extends ~1 viewport
  below its content) and publishes one number, **`--set`**, on a passive rAF-throttled scroll
  listener: `0` while the headline is on screen, ramping (smoothstep) to `1` over the next ~0.4
  viewport of scroll — so the blob is fully dissolved by roughly **20% down the page**.
- `base.css` turns `--set` into the opacity of `#dissolve-layer` — a **flat black sheet in front of
  the blob** (`z-index -3`, between `#blob-layer` at `-4` and `#horizon-layer` at `-2`). The blob is
  *painted out into black*, gradually and completely, rather than its own opacity being cut.
- Once fully covered (`--set ≈ 1`) `main.js` calls `blob.setActive(false)` to idle the loop;
  `setActive(true)` resumes the instant the veil lifts on scroll-up. The **GL context is kept warm,
  never disposed** — re-creating it would risk the locked hero.
- Under `prefers-reduced-motion` `--set` is a hard cut (`0`/`1`), no ramp.
- This replaces the old `body.blob-departed` IntersectionObserver crossfade. (Cache note: changed
  assets are versioned `?v=N` in `index.html` so a long-`max-age` CDN/browser cache can't pin an old
  build.)

## The annealing light (replaces the old "set light" + paper rim)

As the chrome dissolves, its warm key can't simply vanish — the made world below would be lit by
nothing. So a **warm amber pool fades in low at the foot of the world**: the *residual heat of the
cooled chrome*. It is the body's single, coherent light source. **No light is aimed at the absent
blob.**

- It is a glow on the **dark plane only** (liquid / computational), hue from the brand signal family
  (`--signal` / `--signal-2`), **never on paper**.
- `#horizon-layer` (`z-index -2`) sits **in front of the set-veil**, so its warm glow reads on top of
  the black once the blob has set. Its opacity is `var(--set)` — it fades in exactly as the blob
  dissolves. Its child `.anneal-pool` **brightens and swells upward with scroll depth** via
  `--descent` (a separate 0→1 scroll signal set by `body.js`). The cooling reads as a *process*,
  brightest at the close (the furnace's mouth) — by design `--descent ≈ 1` at the page foot.
- `--descent` and `--set` **replace the old `--seam-progress`**. The seam is gone (see below).

## The crystallisation — dark → cream (the cream close)

The cooling that began at the hero **completes** in the lower site: the dark computational plane
**fractures into a low-poly crystalline facet field and resolves into Atheric's cream** — the brand's
paper home (v1 editorial). molten chrome → warm-lit dark → **crystalline fracture** → solid cream
cast. One coherent process, not a second light system: the annealing warmth gives way to the cream
as the metal finally sets solid.

- **One scroll signal, `--fracture` (0→1, `body.js`).** It stays **0** across the dark sections and
  **1** across the cream close, and only ramps across a **text-free transition band** placed between
  the cabinet and the close. The band-linear value is **smoothstepped** (the set-veil's own curve)
  before publishing, so the crystallisation begins quietly as the cabinet exits and finishes gently
  into the cream — no linear snap at either edge of the band. This is the readability strategy made structural: the busy mixed-facet
  midpoint only ever fills a tall, type-free band, so type always sits on a resolved ground (dark
  above, cream below). At the band's edges the facets are near-uniform (dark as the cabinet exits,
  cream as voice enters), so even there contrast holds.
- **The facet field is rendered on a `<canvas>` (`body.js`), not per-facet CSS.** 194 procedurally
  triangulated facets (a non-uniform jittered grid → varied sizes; each carries a `--t` threshold +
  a faintly varied near-black `--d` tone). As `--fracture` passes a facet's `--t` (over a ~0.24
  width) it resolves near-black → cream; thresholds are rank-ordered so **small facets resolve first
  (sparse small shards) and broad facets later**, and spatially so the **cream rises from the
  bottom-right corner upward/leftward** (the white growing up from the cream close below) — bottom
  facets get the lowest thresholds, the top-left the highest; noise keeps it an organic crack, not a
  clean front. All cream by `--fracture ≈ 0.93` (margin before the cream sections). Geometry in a hidden
  `#fracture-geo <svg>` — the **slot-in source**: a supplied Illustrator/SVG facet pattern drops in
  by replacing those `<polygon>`s (same `points` / `data-t` / `data-d` / `data-sh` convention).
- **The resolve is authored motion — the fourth authored moment — not a crossfade** (`body.js` §2b;
  re-authored after the first build read as facets merely tinting in place, with a hard lit edge
  sliding out from under the opaque `.dark-run`). Five behaviours, all in the one canvas draw:
  - **nucleate** — each facet *chases* its scroll-driven resolve with its own inertia (chase factor
    from facet area: small shards snap, broad plates settle late), so the front visibly sweeps under
    scroll and **finishes setting in a breath when the reader pauses**. Scroll stays the master —
    the field only ever converges on the scroll value, both directions (scrolling up re-melts).
  - **crack** — mid-resolve (v 0.03→0.62) a facet contracts a hair about its centroid (≤3px,
    proportional to facet size): the seams part and the gap is an **ember underfill** — the
    annealing light inside the fracture (`--signal`/pool family, dark plane only) — then the
    crystal seats and the seam seals. The embers themselves **cool as the field sets**
    (`× (1 − 0.6·--fracture)`), so late cracks are dark hairlines, not hot outlines on cream.
  - **warm** — the tone ramp is warm-biased per channel (R `v^0.78` / G `v^0.9` / B `v^1.08`,
    endpoints exact: `--d` → `--paper`), so facets pass through warm greys — cooling metal, never
    wet concrete — with a ≤5% brightness **set-glint** as each crystal seats (channels clamped to
    cream). Plus the in-place **shimmer**: ~1 in 7 facets flicker faintly mid-resolve only.
  - **unveil** — per-facet targets are gated by a smoothstep on screen distance below the
    `.dark-run`'s bottom edge (= the band top), so **nothing lights until the opaque cover has
    scrolled clear** — the old hard rectangular seam is gone; the crystallisation trails the
    receding dark organically.
  - **presence** (2026-07-05) — the unveil gates the *resolve*, but unresolved facets were still
    *painted* (the near-black `--d` mosaic at breathe-alpha over the pool), which differed just
    enough from the cover's flat `#050505` that its straight bottom edge read as a clip line. So
    the draw sinks whatever a facet would paint to the plane's own black — **exact `(5,5,5)`,
    fully opaque — at the cover edge**, gaining its true tone (and the breathe translucency)
    over a long smoothstepped falloff below (`pspan`, 55% of a viewport). Anchored to the same
    edge as the unveil gate; paint-only (the resolve choreography, thresholds and scroll timing
    are untouched); spatial correctness, so it applies under reduced motion too. With the
    near-edge paint opaque, the canvas also **occludes the annealing pool at the edge**, so the
    cover can't cut the glow — which is why `#fracture-layer` is now **always opacity 1** (the
    old `--fracture/0.06` fade-in left the canvas translucent through the band's entry and
    exposed exactly that cut; the field still enters from nothing because at first paint the
    whole visible band sits within a few vh of the edge, i.e. sunk to black).
  - **breathe** — while the plane is un-set (early band) the dark facets are faintly translucent
    (`globalAlpha` 0.8 → 1 by `--fracture ≈ 0.2`), so the *real* annealing pool below glows through
    the un-cooled metal; the field seals opaque before `#cream-layer` floods behind it (0.25).
  The life loop runs only while unsettled or visibly mid-resolve (self-stops on the dark and the
  cream); every full-size facet fill carries a same-colour 1px self-stroke to seal antialiasing
  seams. Measured on real GPU (headed Chrome, 1440×900): **120fps through the band, worst frame
  9.4ms, zero long frames, no console errors**.
- **The set-seal, fig. 06 — the casting's title block (the crystallisation's coda).** The band's
  cream half held nothing once the facets resolved; now it carries what a machinist's drawing
  keeps at the sheet's corner: the certification tab of the cast. A hairline-boxed title block —
  stamp cell + divider + a four-row mono ledger (`material — liquid chrome, cooled` / `finish —
  paper, cream` / `scale — 1 : 1` — the masthead's "drawn to scale", literalised / `set solid —
  hel · mmxxvi`, a touch more ink) — with the studio mark that fig. 00 *drew* at the masthead
  now *applied* as its stamp: a hallmark-scale echo of fig. 00's construction grammar (same
  `rotate(-45)` NE departure, `pathLength="100"`, through-edge ticks, punctum last). **Driven
  entirely by `--fracture` in pure CSS** (`fracture.css`, no JS, no timers, fully
  scroll-reversible), staged like drafting, not like a reveal: the frame's four hairlines
  **scribe clockwise** (the craft stage's own drawn-rule grammar, 0.66→0.84) → the ledger inks
  row by row (0.76→0.90) → the divider sets → the stamp presses in and its orbit scribes
  (0.80→0.86), ticks extend, the **punctum arrives last** (0.875→0.905, flat accent — no glow on
  paper) → the fig. caption (`fig. 06 — the cast, certified`) inks beneath (0.90→0.93). **The
  seal's berth (2026-07-06):** sticky at `top: calc(48vh − 56px)` so the boxed tab reads
  optically centred (~48vh) while it scribes, from short ultrawide (~480px) to tall viewports —
  and the band carries `padding-bottom: clamp(90px, 16vh, 180px)` (border-box: the band's
  painted 138vh and the `--fracture` ramp, which reads the border box, are untouched) so the
  sticky range ends early and the certified tab **settles ON the sheet** with clear cream below
  it — measured 144/135/90px above the band's end at 1440×900 / 390×844 / 1638×480 (it
  previously rode to 0px and came to rest glued against the voice datum, reading unfinished).
  The caption sits in flow inside the sticky footprint so the assembly can never overhang the
  band into the voice datum. Ink only ever on resolved ground — re-measured at the higher
  station: zero-defect cream under the box at full ink (0.74); through the 0.66→0.74 fade the
  worst residue is near-cream warm grey (R≥200) on ≤3% of the box area while the ink is still
  translucent. Reduced motion: presents
  composed (no scribe/stagger/press); its appearance still tracks scroll, like the facets. Trap:
  **no `vector-effect: non-scaling-stroke` on the orbit** — it computes dashes in screen space
  and breaks the `pathLength` normalisation (an ~8% seam at the NE station even fully scribed).
- **Two fixed layers at `z-index 0`** (in front of the dark backdrop stack at negative z, behind all
  content at z ≥ 1): `#cream-layer` (solid `--paper`, floods in during the latter transition —
  guarantees the cream close and backs the facets) and `#fracture-layer` (the canvas). `--fracture`
  only drives **two element opacities** in CSS (`fracture.css`) — cheap.
- **The cream close is a token flip.** `.on-cream` on voice / begin redefines the semantic
  ink + rule roles (`--ink`, `--ink-dim`, `--ink-faint`, `--rule`) to near-black on cream, so every
  heading, lede, list and hairline re-inks automatically; the one hot orange accent is untouched (it
  belongs on cream). The invitation CTA becomes v1's dark pill; the warm computational glow is
  dropped (the cream *is* the resolve). (The footer deliberately does NOT take `.on-cream` — see
  *the bench, at night* under the section order.)
- **Reduced motion:** the field's life is off — no nucleation inertia, no cracks/embers, no glint,
  no shimmer, no translucency, no rAF loop — the field is drawn once per scroll position (static),
  while the black→cream resolve (and the warm ramp, and the unveil gate — spatial correctness, not
  motion) still tracks scroll, as the brief requires.

## The cast's edge — cream → dark (the loop closed)

The reverse seam. The entry band crystallised the dark **into** cream in motion; at the document's
other end the cast sheet simply **ends** on the dark bench. Before this pass the cream close met
the footer as a hard straight cut — asymmetric and unconsidered next to the entry band; now a
**static faceted border** closes the loop in the same material language, deliberately **not** a
second motion moment.

- **Markup:** an `aria-hidden` `.cast-edge` strip between `#b-begin` and the footer, holding two
  inline-SVG **plates** in the entry field's grammar (jittered-grid triangulated `<polygon>`s):
  wide 1600×230 (>860px) and narrow 800×200 (≤860px) — two authored plates so facet proportions
  stay in-family at both sheet sizes (`preserveAspectRatio="none"` stretch stays near-uniform
  within each plate's width range; heights in `fracture.css`).
- **Tones are baked fills** stepping `--paper` → **`--bone` `#efece4`** (the reserved darker
  cream, finally used) → warm greys → `#050505`, computed with the crystallisation's own
  warm-biased ramp (body.js §2b: `d + (CREAM − d) · v^(0.78/0.9/1.08)`, endpoints exact) at fixed
  stations `v = 1 / 0.985 / 0.955 / 0.82 / 0.62 / 0.42 / 0.24 / 0.10 / 0.05 / 0`. The 0.985 and
  0.05 whisper steps keep the geometry faintly legible against both grounds — the entry band's
  own near-uniform edge behaviour. Dark bites deepest **top-left**, cream survives lowest
  **bottom-right**: the entry band's diagonal grain, same direction, one grain through the document.
- **Seam law:** facets laying a full **edge** on the strip's top boundary are exact paper, on its
  bottom exact ground-dark — both meets are invisible and the fragmentation carries the whole
  transition. Every facet fill carries a same-colour 1px self-stroke (the canvas field's own
  antialiasing-seam seal). No text ever enters the strip; the begin section's bottom padding and
  the footer's top padding hold the neighbours clear.
- **Zero runtime cost:** no scroll signal, no shimmer, no rAF, no CSS animation/transition —
  reduced motion is identical by construction. Generator (jittered grid → random-diagonal /
  centre-fan triangulation → station-snapped tones, seeded): kept out of the repo with the docs;
  the plates in `index.html` are the artifact.

## Materials & physics law (honor everywhere)

- **Liquid / computational behaviour** — glow, the iridescent blob, the annealing pool — lives on
  the **dark plane only**: the blob at the hero, the annealing light at the foot. Never on paper.
- **Paper never appears whole on the dark side any more** (the specimen plates are retired,
  2026-07-05). The cabinet's **two castings** (`.work__shard`, inline SVG) carry the
  crystallisation's own tone family instead: facet fills baked from the warm-biased dark→paper
  ramp — near-black over most of the body, warm greys rising bottom-right toward the annealing
  light, one near-paper glint each — with 1px same-colour self-strokes. They are the works the
  furnace made (clara · under the code, both live), and they keep the old plates' role of
  foreshadowing the cream. No glow / blur / morph on them; their embers are **flat signal
  fills** (the dark plane only, per the law above).
- Everything else (the studio's voice, process, the masthead) is **set directly into the cooled dark
  plane** as light-on-dark typesetting with hairline rules — not on paper.

## The grammar: editorial-technical (the machinist's drawing)

Carries v1's DNA forward and elevates it:

- **Drawn hairline rules with tick marks** — each section opens with a dimension line that scribes
  itself left→right and sets its ticks (the `.datum` / `.rule--ticked` elements).
- **Monospace coordinate metadata** — `JetBrains Mono`, uppercase, wide-tracked: the masthead
  title-block corners (`— studio atheric / helsinki, fi / est. 2026` · `liquid chrome / № 1 ·
  ongoing`), index labels (`— index № 0n / …`), spec coordinates (`x01 … x06`), the live **hel
  clock** (echoes v1's `HEL · 18:53:17`), the works' meta/spec rows + fig. captions, the footer
  colophon.
- **Big lowercase Archivo display** with the **Instrument Serif italic-orange breath** (one italic
  word per heading). Instrument Serif roman (bone) also carries the process movement titles and the
  serif ledes / pull quote.
- Same brand tokens, same three type families — **no new brand colours or fonts**. The type is
  **self-hosted** (`src/styles/fonts.css` + `/fonts/` — a verbatim mirror of the Google css2
  payload, same subsets/unicode-ranges so rendering is unchanged, incl. the mono `№` from the
  cyrillic subset); no font request leaves the origin, and /privacy carries no third-party
  font disclosure.

## Section order (the broadsheet)

The hero nav anchors (`#b-studio` / `#b-process` / `#b-cabinet` / `#b-begin`) are honoured, so the
locked hero nav still resolves.

1. **dark hero** — *we engineer weightless software* (the overture, **LOCKED**; the blob lives here
   and only here; the craft study — "see how the chrome is made" — launches from here).
2. **the handoff / masthead** — the cooled plane receives the hero. Opening datum line + v1's
   monospace title-block corners + *this is the drawing.* + the thesis lede + **fig. 00** (the
   mark, drawn — see the authored moments under Motion vocabulary).
3. **the studio** (`#b-studio`) — the studio in brief as a **specification**: a serif lede + a
   coordinate-labelled `<dl>` spec (what / look / voice / type / mark / motion). v1 "at a glance".
4. **how we work** (`#b-process`) — *three movements, one object*: sculpt / forge / polish as an
   `<ol>` with mono `movement i–iii` labels, serif titles, dimension marks. Carried from builds/dark.
5. **the cabinet** (`#b-cabinet`) — **the works (reworked 2026-07-05)**: the invented specimens
   and their bench drag-rail are gone (three audits named them the weakest conversion link).
   Two REAL products present as **castings** — faceted shards in the crystallisation's grammar —
   each annotated as a broadsheet ledger entry: mono meta row with a breathing live-dot, a serif
   **title-link** (resting hairline so it reads clickable before the hand arrives), real copy in
   the house voice, a mono spec line, and the boxed **open instrument** (mono verb + the URL
   printed + accent arrow, ≥44px). **clara** (gym.atheric.eu — phone-first coach-led training
   log: gym sessions, cardio, eating, bodyweight, recovery, an assistant) and **under the code**
   (under.atheric.eu — interactive book: 5 parts · 18 chapters · 242 figures, transistor →
   civilization). fig. 07 / fig. 08 continue the figure series. Entries alternate shard/text
   (`.work--flip`) — the axis-break role kept, now vertical. Heading: *two works, both live.*
   **Still the last dark section — the castings' warm facets foreshadow the cream.**
5a. **the fracture** — a text-free crystallisation band (dark → cream), bracketed by two quiet
   artifacts on resolved ground only: the entry note (dark side) and the **set-seal** (cream
   side — the mark, applied). See *The crystallisation*.
6. **voice** (`.on-cream`) — *quiet, on purpose*: the lead pull-quote at chapter scale + the do /
   do-not ledger. **The cream close begins here** — dark ink on Atheric's paper (v1 editorial).
   The section body (pull + ledger) **steps off the shared left axis** (≥861px) while its head
   stays on it — the scroll score's "off-measure voice", enacted.
7. **the close** (`#b-begin`, `.on-cream`) — the invitation on cream. *a small thing, and finish it
   well.* + the `write to us` CTA (the hero `.b-cta`, flipped to v1's dark pill on cream). The
   headline's **final period sets last** — warm, then cooled to ink (see the authored moments).
7a. **the cast's edge** — the static faceted border where the cream sheet ends on the dark bench:
   the reverse seam, in the crystallisation's grammar but at rest. See *The cast's edge*.
8. **footer — the bench, at night** (the end panel). The document closes and the reader is
   returned to the **dark plane it was drawn on**: a full-bleed panel in the machine's own tone
   (`--ground-dark`, base dark semantic tokens — no `.on-cream`), so the arc bookends: molten
   machine → cooled drawing → cream cast → **the bench the sheet rests on**. It opens with its
   own drawn ticked datum (the sheet grammar), the preferences ledger and colophon title block
   rise on the standard cadence, and low at the panel's foot sits the **banked furnace** — the
   annealing light's last, faint static warmth (glow on the dark plane only, per the materials
   law). The page end is sealed (2026-07-05): the page's vh/clamp paddings sum fractional, so
   `scrollHeight` rounds ~1px past the footer's painted box, and that row showed the fixed
   `#cream-layer` — a light sliver at the true bottom. Now `html` carries
   `background: var(--ground-dark)` + `overscroll-behavior-y: none` (base.css — no rubber-band
   where the engine allows refusing; a dark canvas where it doesn't), and `.foot` carries the
   **foot seal**: `box-shadow: 0 120px 0 0 var(--ground-dark)` — ink-only (no layout, no
   scrollable overflow), painted in the footer's own order **above the z-0 cream layer**, so the
   bench covers to the document's end at any viewport height.
   It carries the **preferences ledger** + the colophon title block. The ledger
   is v1's preferences-sheet *studio* section (from `home`/`liquid-chrome-v2`'s slide-out
   `preferences.js`) recast in the broadsheet's coordinate-ledger grammar: mono `dt` labels +
   hairline rows — `motion` (a note: follows the OS reduce-motion setting; v1's motion·sound·lab
   *toggles* are deliberately not carried — v2 has no sound and no lab, and a real motion toggle
   would require touching the LOCKED hero/colophon styles), `source` (→
   github.com/atheric-studios/atheric-exhibition, where v1 pointed it), `legal` (→ `/privacy` +
   `/privacy#imprint`), `contact` (hello@atheric.eu — v1's live address, now used sitewide incl.
   the begin CTA). The title-block row below is carried verbatim.

   **`/privacy` (privacy.html)** carries v1's full live notice merged into the calm cream reading
   sheet: imprint ledger (operator YDT Holdings Oy · Y-tunnus 3608568-3 · **VAT ID FI36085683** ·
   registered **Hämeenlinna** — both verified against the PRH/YTJ open-data registry; v1's "not
   VAT-registered" and the earlier "Helsinki" were stale/wrong), the planned-aputoiminimi trade
   name, the licence block (source published for transparency, linked to the exhibition repo),
   and the notice itself (what we collect / don't collect, lawful bases, twelve-month retention,
   EU-US DPF transfers, the six GDPR rights + thirty-day response, tietosuoja.fi complaints).
   The registered street address is deliberately unpublished (v1's authored stance) — available
   on request.

The scroll *score* varies measure + alignment so the eye never learns one pattern: full-bleed
datum/masthead → two-column spec → ledger column → full-bleed horizontal bench → off-measure voice →
centred warm close.

## Motion vocabulary

Disciplined: **transform / opacity only**, one shared easing (`--ease`, the hero/dark build's own
curve), **one cadence** (the hero's 0.09s stagger rhythm, reused for group staggers and heading
lines), **at most one or two key elements moving per view**, no scroll-jacking, no parallax. All
toggled by **one IntersectionObserver** (`body.js`) plus **one passive scroll → rAF** for the light.
Durations: blocks `--dur-rise` 0.75s (opacity lands earlier, 0.55s, so blocks *settle*), heading
lines `--dur-line` 0.95s (near the hero's 1s), rules `--dur-rule` 1.05s.

- **drawn rule** — `scaleX` 0→1 (origin left); the ticks set on only after the line is mostly
  drawn (0.4s delay) — measure first, then marks.
- **heading line-rise** — each authored line (`.ln > .ln__in`) rises out of an overflow mask,
  staggered 0.09s per line.
- **block fade-rise** — paragraphs / spec rows / ledger items, staggered 0.09s inside
  `[data-reveal-group]`.
- **the castings assemble + the embers answer** (the cabinet, replaces the plate deal /
  hover-lift / live tilt — all retired 2026-07-05 with the invented specimens). Each work's
  shard facets fade in **once** as the figure reveals — dark facets first, warm last (the
  object cools into visibility) — via per-facet `transition-delay` baked inline (`--fd`,
  16–22ms steps), opacity only, keyed off the shared IO's `.is-in`; **no rAF, no scroll
  coupling**. A **keeper ember** breathes at rest (`emberBreath`, opacity 0.16↔0.32 — the
  casting is not cold yet) and the full ember set (4 facets each, at the dark/warm boundary)
  ignites to flat signal under `:hover` / `:focus-within` — the instrument-hover family,
  extended to the object. Reduced motion: facets composed, keeper static at 0.24, the
  ignition still answers instantly (a state, not a motion).
- **movement gauge + step-hover** (how we work) — each movement's right field carries a **drawn
  dimension gauge**: hairline track, station ticks at 0 / i / ii / iii (`repeating-linear-gradient`,
  29px period on an 88px track), and the travelled span filled — `scaleX` at `--dur-rule`, 0.5s
  after the row rises (measure first, then marks), fractions set per `.movement:nth-child`.
  On fine pointers the row answers the hand — the dark build's own step-hover, carried over:
  the mono number inks `--accent`, the main cell eases 8px right (0.5s `--ease`). Hidden `≤860px`
  with the rest of the dim column; reduced motion presents the gauges at their stations.
- **scroll-scored annealing light** — the one scene-wide continuous motion (`--descent`).
- **hel clock** — the masthead's live local time; its live-dot breathes (`bPulse`, the hero's own
  keyframe) — off under reduced motion.
- **the cools moment** — the masthead lede's italic *cools* arrives still molten (amber
  `--signal-2`, a faint warm halo — glow on the dark plane only) and settles to the resting
  signal: one-shot CSS keyed off the heading's own `.is-in`
  (`[data-anneal].is-in ~ .lede em` → `ledeCool`, 2.2s, 1.15s delay). The final period at the
  close is this moment's sibling. Base state composed → no-JS / reduced motion static.
- **the instrument hovers** — the coordinate ledgers answer the hand, fine pointers only: a
  spec row's label inks `--accent` and its hairline strengthens; the footer ledger answers
  quieter (label lifts to dim bone, no signal — it is night at the bench). The movements'
  step-hover (number inks, main cell eases 8px) is the same family.
- **the pull word-rise** — the voice quote (the cream close's chapter-scale line) rises **word
  by word** out of per-word masks: body.js splits at word boundaries (the curtain's technique —
  spaces stay bare text nodes, the italic `<em>` rides as one word), 45ms letterpress stagger on
  the shared ease. `.pull--split` hands the block reveal to the words. Reduced motion / no-JS:
  the split never happens — the composed paragraph stands.
- **the running folio** — the broadsheet's sheet-corner, a **new fixed element**: a mono line
  low in the left gutter naming the sheet under the reader (`№ 01 / the studio` …), fed by the
  sections' `data-folio` labels through one centre-band IO (`rootMargin -45%/-45%`). It fades
  in **exactly as the chrome sets** (`opacity: var(--set)`), re-inks per ground (`.folio--ink`
  on `.on-cream` sections; through the band it follows `--fracture` via the `folioBandInk`
  hook, flipping at 0.45), and label changes **tick through a letterpress mask** (`folioSwap` —
  out upward, in from below). `aria-hidden` (it duplicates the index labels), pointer-inert,
  hidden `<900px`; reduced motion swaps the text plainly.
- **selection & system chrome** — `::selection` is near-black ink on the signal; `color-scheme:
  dark` keeps UA scrollbars/controls off-white-free on the plane.

**The authored moments** — four bespoke motion graphics across the page: fig. 00 (below), the
final period (below), the curtain (the craft study's open/close, its own section), and the
crystallisation's nucleation (the fracture band — see *The crystallisation*). The two below are
one-shot, CSS-only, on the shared IO via `[data-fig]` / the heading's own `.is-in` — no new rAF:

- **fig. 00 — the mark, drawn** (masthead, `.fig-mark`): the studio mark the spec describes in
  words (x05) constructs itself as the broadsheet's title figure on the masthead's empty right
  field. Centre cross locates the body (0.12s) → the orbit is scribed (`--dur-rule`, departing
  from the punctum's NE station via `rotate(-45)` on the circle path) as a **molten iridescent
  stroke** (brand `--signal-2`/`--signal`/`--cool` gradient) over the bone hairline → the molten
  stroke **cools away** (1.3s) → ticks extend outward (1.15s) → the punctum ignites where the
  scribe closed (1.5s), with a static warm halo (dark plane — glow allowed). Then perfectly
  still. Hairlines stay 1px via `vector-effect: non-scaling-stroke`. `aria-hidden` (the spec
  carries the words); hidden `<900px`; reduced motion presents it fully drawn (transitions
  killed → final states). Trap: the molten stroke's `url(#fig-molten)` must be scoped
  `.fig-mark .fig-mark__orbit--molten` to outrank the base hairline stroke rule.
- **the final period, set** (the close, `.fin-dot`): the begin headline's lines rise **without**
  their full stop; a beat after they land the period arrives **warm** (flat `--accent` — no
  glow/blur on paper, per the materials law) and **cools to ink** (`finSet` keyframes, 2.2s,
  1.2s delay, fill `both`). The machine's last ember, finished deliberately — the copy performed
  typographically. Base state is the composed one (ink), so no-JS and reduced motion are static.

**Reduced motion** (`prefers-reduced-motion: reduce`): every panel presents in place; headings
un-mask and wrap; rules are drawn; the annealing light is static (no scroll listener, no swell); the
blob departure / handoff is an instant cut; smooth-scroll is off; ambient loops (`[data-ambient]`)
stop. No motion-dependent content.

## File map

| file | role |
| --- | --- |
| `src/styles/fonts.css` + `/fonts/` | the three brand families, **self-hosted** (mirrored Google css2 subsets, verbatim). |
| `src/styles/tokens.css` | brand primitives **+ three-layer broadsheet tokens** (semantic roles, measures, motion; the plate/tint tokens are retired). `--descent` replaces `--seam-progress`. |
| `src/styles/base.css` | the dark ground, the **set-veil** (`#dissolve-layer`, opacity `--set`), the **annealing light** + scroll-scored `.anneal-pool` (opacity `--set`, pool `--descent`), the backdrop z-layer stack, smooth-scroll (off under reduced motion). |
| `src/styles/body.css` | **the broadsheet** — every post-hero section, the motion primitives, responsive, reduced-motion. |
| `src/styles/fracture.css` | **the crystallisation** — the `#cream-layer` + `#fracture-layer` (canvas) opacities off `--fracture`, the text-free `.fracture` band, the `.on-cream` token flip for the cream close, and **the cast's edge** plate sizing (`.cast-edge`, static). |
| `src/scripts/main.js` | the **blob lifecycle** only: mount + the scroll-coupled `--set` dissolve (headline-anchored) + idle/restore of the render loop. (Seam/ScrollController removed.) |
| `src/scripts/body.js` | broadsheet behaviours: reveals (IO), **the pull word-split**, scroll-scored light, **the fracture canvas renderer** (parses `#fracture-geo`, draws the dark→cream resolve + shimmer, publishes `--fracture`), draggable bench + **the live plate tilt**, **the running folio**, hel clock. |
| `src/scripts/dark.js`, `src/styles/dark.css` | the hero behaviours / styles. **LOCKED.** |
| `src/scripts/chrome-blob.js`, `blob.js` | the blob shader + adapter. **Shader/SDF/material LOCKED**; the file now *exports* `cameraState` + `HOME_CAM` (plumbing only) so the craft study can fly the lens. |
| `src/scripts/craft.js`, `src/styles/craft.css` | **the craft study** — "see how the chrome is made": the blob-zoom reveal (see *The craft study* below). Replaces `colophon.js` / `colophon.css` (the dialog); the colophon copy lives on as the study's technique tab. |

**Removed in this pass:** `transition.css` + `transition.js` (the seam), `paper.css` (the
paper-panel body), `paper-reveal.js`, `paper-rim.js`. The `#seam` and `#cream` regions and the old
marquee/interludes/bench are gone.

## What stays from the substrate (unchanged / LOCKED)

`chrome-blob.js` verbatim shader (SDF, 72-step raymarch, thin-film material) + `blob.js` adapter,
`uScroll` pinned, the hero markup + layout, and v1 hero perf (DPR 1.4, 72-step) all stand. The blob
departure (IO → `setActive` → warm GL context) is preserved. (The colophon *dialog* was replaced by
the craft study — its copy is carried verbatim into the study's technique tab.)

**The chrome, reframed (2026-07 — plumbing only, shader byte-identical):**

- **Framing:** `HOME_CAM` trucks up 0.3 world units (pos+look together — same viewing angle, the
  blob simply sits *lower*, squarely behind the hero headline/lede) and `fov` 1.6 → 1.7 (~6%
  larger on screen). Verified at multiple drift phases at 1440×900 and 390×844 — nav, pills and
  CTA stay clear in every phase. The study's `STAGE`/figure cams frame themselves (unchanged) and
  still centre the blob.
- **Tempo:** the render loop advances the blob's clock by `dt × speed`, easing `speed` toward
  `speedTarget` (~1.2s time constant) — **phase-continuous**, so tempo changes swell, never snap.
  `BLOB_SPEED = { home: 0.85, study: 1.05 }` (exported): at rest the chrome idles a touch slower
  (weightier); the craft study swells it a touch livelier on entry (craft.js writes the target;
  measured 0.85 → 0.91 @0.6s → 1.02 @3s, easing back after close). Under reduced motion time is
  frozen (`motionQuiet`) and the tempo machinery never engages.
- **The study's glass, densified:** with the larger blob the fresnel bloom could glare through a
  figure panel docked over the bright body (fig. 01). Panels 0.9/0.93 → 0.95/0.97 + blur 22
  (technique tab matched) — the readouts stay clean over any surface; still glass, not cards.
- The module-cache trap applies as ever: `chrome-blob.js?v=N` bumped **identically** in `blob.js`
  and `craft.js` (one URL, one `cameraState`), and the whole import chain re-stamped
  (`main.js` ← `blob.js`).

## The craft study — "see how the chrome is made" (the blob zoom)

Imported from **v1's inspect lab** (`atheric-studios/home` → `liquid-chrome-v2/src/js/inspect.js`,
the `[ inspect chrome ]` interaction) and rebuilt in v2's grammar; it replaces the colophon dialog
on the same hero trigger. Mechanics (v1's, proven):

- **The zoom is a real 3D camera flight, not CSS.** The (locked) shader always had
  `uCamPos/uCamLook/uCamFOV`; the render loop lerps `cameraState.current → .target` each frame
  (exponential — it *settles*). `craft.js` only writes targets; `chrome-blob.js` exports
  `cameraState`/`HOME_CAM` for it (a plumbing-only diff — **shader/SDF/material untouched**).
- **Five explain-dots (`fig. 01–05`)**, each a fixed world anchor + its own cam (rescaled for v2's
  1.3× SDF). A rAF projects anchors through the LIVE camera (the shader's camera math inverted in
  JS) so dots ride the surface mid-flight; each dot flies the lens to its region and opens a
  **dark-glass panel** (Archivo lowercase title + serif breath, mono fig labels, a broadsheet code
  instrument with GLSL quoted verbatim from the live shader — pre-highlighted static HTML, no
  runtime parser, no backticks). Panels only reveal once the camera has **physically landed**
  (arrival poller on cam distance). Content was rewritten for v2's actual material (raymarch /
  smin / thin-film / fresnel bloom / orbits + the set).
- **The technique tab** — the old colophon copy, verbatim, as a hovering dark-glass disclosure
  (open by default on desktop, collapsed on mobile; it yields while a figure is open).
- **v2 enhancements:** native fullscreen transparent `<dialog>` (free focus trap, Esc via `cancel`,
  `aria-modal`, focus restore); **the curtain** (below) carries the open/close; an **ambient
  orbital drift** circles the stage cam while idle so entry arcs and the study keeps breathing;
  dots/tab set on staggered at the 0.09s cadence only after the camera lands **and** the curtain
  floor (~1.15s) has passed — the release beat owns the stage; camera ease drops to 0.06 inside
  the study (statelier), 0.075 restored on exit; cursor-tracking freezes only while a figure is
  open (alive in overview, calm while reading).

### The curtain — the machine's frame parts (the third authored moment)

The study's open/close is the site's **one elaborate beat**, richer and longer than the unified
cadence but built from its parts (0.09s delay grid, `--ease` family, transform/opacity only).
Concept: *the machine's frame parting to reveal the light it makes.*

- **Wave 1 — the frame lets go (0–0.6s):** the progress thread pinches to a point (`scaleX(0)`,
  origin centre); the nav parts in thirds — logo left, links up, CTA right (45ms half-steps). The
  camera flight starts underneath at t=0, so the reveal and the approach overlap.
- **Wave 2 — the curtain parts (0.09–1.1s):** `craft.js` splits the hero headline **at word
  boundaries** into three seam segments (`.crt--l` / `.crt--em` / `.crt--r`; v1's split-text
  technique — spaces stay as bare text nodes, so kerning, line-breaks and the resting render are
  untouched). The halves run **keyframe animations**: a 9px *inhale toward the seam*, then drawn
  to the wings (∓24vw) with 1.5° of fabric rotation, the right half a half-beat late. The kicker
  leads the left curtain; lede/pills/CTA drop below (pills part left/down/right individually);
  the **aurora exhales** — swelling via the independent `scale` property (composes with its
  inline `translateX`, and its inline opacity forces the one `!important`) while dimming; the
  chrome rim arc dilates.
- **The release:** ***weightless*** — the italic signal word — is left alone on the emptied
  stage, **sags 7px** under the expectation of weight, then **rises into the blob** (9vw, −9vh,
  scale 0.93) and dissolves into the gold heart: the word performs its own meaning, handed back
  to the machine. Only after this does the shell compose.
- **Wave 3 — the stage is measured (0.45–1.7s):** the shell fades in and the inset frame is
  four hairlines that **scribe themselves clockwise** (the broadsheet's drawn-rule grammar);
  the mono corners set; dots + tab arrive last (compose floor).
- **The close is a true reversal from any state:** the open runs on keyframes, but the return
  specs live on the **base rules as transitions** — removing `.craft-active` drops the
  animations and the transitions catch the live computed value, so Esc **mid-open** draws the
  curtains closed from wherever they were (no snap, no drift; verified). The halves return on a
  slight **overshoot bézier** (`cubic-bezier(0.3, 1.26, 0.32, 1)`) — they meet, kiss past the
  seam, settle — and the signal word lands last, re-lit (0.27s delay).
- **Perf:** transform/opacity only (plus compositable independent `scale`); no animated filters,
  no clip-path, no layout writes; the blur on the aurora is static and only its opacity/scale
  animate. Measured on real GPU: **open 121fps / close 120fps, worst frame 9.4ms, zero long
  frames**.
- **Reduced motion: no curtain.** Open/close is an instant cut between composed states
  (`.crt` animations killed, `opacity: 0` while open; camera snapped in craft.js); all content
  immediately reachable.
- **Departure reconciliation:** entering snaps to top + locks scroll (`body.craft-active`,
  contained overlay), so `--set` stays 0 and the loop never idles mid-zoom; `main.js` additionally
  guards (forces `--set` 0 / keeps the loop alive while the class is present). Exit restores
  `HOME_CAM`, unlocks scroll, reverses the recede.
- **A11y / reduced motion:** trigger, dots (44px targets), tab and panels are keyboard-operable
  (keys 1–5 select figures; Esc exits; panel focus hand-off with `tabindex="-1"`; `aria-expanded`/
  `aria-controls` on dots and tab). Under `prefers-reduced-motion` every camera write also snaps
  `current` (instant composed state), transitions/pulse die in CSS, and all copy — static in
  `index.html` — stays readable.
- **Module-cache trap:** `chrome-blob.js` is imported with a `?v=N` stamp; `blob.js` and `craft.js`
  must use the **identical specifier**, or the module loads twice and the study writes to a
  different `cameraState` than the one rendering.
- Verified on real GPU (headed Chrome): 106–113 fps through the flights, no console errors.

## Known traps

- **The fragment shader is a JS template literal** in `src/scripts/chrome-blob.js` (`fsrc = \`…\``).
  A stray **backtick anywhere inside it — including in a GLSL comment — terminates the string and
  breaks the whole file.** Keep all shader comments backtick-free.
- **The castings' facet SVGs are generated artifacts** (jittered ring + interior points →
  Delaunay → grain-mapped station tones → per-facet delays; seeded). The generator lives with
  the docs, out of the repo — same policy as the cast's edge. Re-shape by regenerating, never
  by hand-editing polygons; keep fills and self-strokes identical per facet.
- **Authored heading lines never wrap.** `[data-anneal] .ln__in` is `white-space: nowrap` so the
  line-rise mask (`overflow:hidden` on `.ln`) can't clip a long word; do **not** put a ch-based
  `max-width` on any `.sheet__head` variant (it would force the big display type to wrap, then clip —
  this bit the voice head's `30ch`). Mobile (`≤600px`) re-enables wrapping and neutralises the mask.
- **A big animated triangulated field can't be per-facet CSS.** Driving ~194 `<polygon>` fills off a
  root custom property (`color-mix` on `var(--fracture)`) forces a full style recalc every scroll
  frame → ~30fps. The facets are rendered on a **`<canvas>`** instead (same geometry, read from the
  hidden `#fracture-geo`); only 2 element opacities read `--fracture` in CSS. Keep it that way.
- **The fixed facet field must never outrun its cover.** The canvas is viewport-fixed while the
  opaque `.dark-run` scrolls; without the unveil gate (per-facet smoothstep on screen distance
  below the band top) already-lit facets slide out from under the cover's straight bottom edge as
  a hard seam — and without the **presence fade** even unresolved facets do (their `--d` variance
  + breathe alpha vs the cover's flat black). If the band is ever moved or re-nested, keep BOTH
  anchored to the opaque cover's true bottom edge (`edgeY`, body.js §2b). And keep
  `#fracture-layer` at **opacity 1**: any layer-level fade leaves the canvas translucent at the
  band's entry, unable to occlude the annealing pool, and the cover edge cuts the glow as a
  straight line.
- **The WebKit negative-z compositing trap (2026-07-06).** The backdrop stack (ground / blob /
  veil / pool / vignette) lives at NEGATIVE z-index while body carries an opaque background —
  per CSS painting order an in-flow block background paints ABOVE negative-z positioned
  descendants of the root stacking context. WebKit honours this for the accelerated WebGL
  canvas: the blob rendered every frame (readpixels showed the full thin-film palette;
  context, compile, link, draws, glError all clean) but composited invisible under body's
  background. Chrome's compositor is lenient and masked it — all pre-launch verification was
  Chrome-only. Fix: `isolation: isolate` on body (base.css) makes body its own stacking
  context, so its background paints below its negative-z children in every engine; isolation
  (unlike transform/filter) creates no containing block, so the fixed layers stay
  viewport-fixed. Chrome A/B: byte-equal outside compositor dither (maxΔ 2/255). Do not
  remove; verify BOTH engines (playwright webkit) for anything touching the backdrop stack,
  body/html backgrounds, or layer z-order.
- **The bottom-of-page reveal trap.** The shared reveal IO uses `rootMargin '0px 0px -7% 0px'` —
  elements living in the page's last few percent (the footer's colophon row) can NEVER intersect
  that shrunken root and would stay invisible forever. Footer revealables observe a second IO
  (`ioFoot`, unshrunken root, threshold 0.01) in `body.js`. Keep any new element near the page
  foot on that observer.
- **A new canvas/shader is fine, but the same backtick rule applies** if you ever add GLSL: no
  backtick inside a template-literal shader.

## Status

Hero locked. The post-hero is the cooled-chrome broadsheet, now closing through the **crystallisation
into cream**, after a **craft polish pass** (one motion cadence matched to the hero, tightened
vertical rhythm — `--bay` `clamp(92px, 14vh, 168px)` — display tracking matched to the hero headline
at `-0.045em`, faint-ink lifted for small-mono legibility: dark `0.38`, cream `0.52`) and the
**fracture motion re-authoring** (the nucleation pass: the facet crossfade became the fourth
authored moment — nucleate / crack / warm / unveil / breathe, see *The crystallisation*; the
hard `.dark-run` unveil seam is gone). Verified on real-Chrome/GPU at desktop (1440), mobile
(390, no overflow) and with reduced motion: the `--set` dissolve (`0` at the hero → `1` ≈20% down),
`--descent` scoring, the `--fracture` resolve (`0` through the cabinet → ember-seamed nucleation
across the text-free band → `1` cream by voice, re-melting on scroll-up, settling in a breath on
pause), the cream close legibility, reduced-motion (facets static + gate applied, resolve still
tracks scroll), canvas perf (animated band scroll 120fps / worst frame 9.4ms / 0 long frames), the
hel clock, and **no console errors**. The ending was then hand-finished: the band's cream half
carries **fig. 06, the set-seal title block** (see *The crystallisation*), and the footer became
**the bench, at night** — the dark end panel with the banked furnace and the standard reveal
cadence (see the section order; bottom-of-page reveal trap in *Known traps*).

A **premium polish pass** (two sweeps, then stop) then refined within the grammar without touching
structure: the movements gained their **dimension gauges + step-hover** and the plates their
**registration marks + perspective-tilt lift** (both under Motion vocabulary above); the footer's
colophon row now sits on its own closing hairline (**the ledger ruled off** — a double-rule close
at the ledger's row rhythm), the banked furnace was lifted to perceptibility (0.10 / 0.04 alphas)
with a fuller bottom breath (48px), and fig. 06's caption tracking was matched to fig. 00
(0.2em — one fig. voice). Verified live on atheric.eu (headed Chrome, 1440×900): 120fps through
process→cabinet, the band and begin→foot, worst steady frame 9.4ms (the occasional single spike
at band *entry* predates this pass — measured identically on the prior live build); 390px no
overflow; reduced motion presents gauges/marks composed; no console errors.

A **second polish** followed — *the site answers the hand, and the folio runs*: the cools
moment (masthead), the instrument hovers (spec + footer ledgers), the **live weighted plate
tilt** with true layered depth (cabinet), the **pull word-rise** (voice), and the **running
folio** — the one new fixed element, the broadsheet's sheet-corner (all under Motion
vocabulary above). Block reveals travel 24px (a touch more presence, same cadence). Verified
on atheric.eu: interactions + folio states programmatically, RM composed (no split / no tilt /
plain folio text), 390px folio hidden + no overflow, A/B frame times against the prior live
build identical (zero long frames), no console errors.

**The seam symmetry pass (2026-07-05):** the cream→dark reverse seam (a hard straight cut) became
**the cast's edge** — the static faceted border in the crystallisation's grammar (see its section).
One strip, two plates, zero animation; verified live at 1440 and 390.

**The page-end seal (2026-07-05):** the fractional-height cream sliver at the document bottom and
non-black overscroll — fixed with the dark root canvas + `overscroll-behavior-y: none` + the
foot seal (see the bench section). Measured before/after: bottom rows (243,237,221) → (21,12,8),
the banked furnace's own warm dark, at five viewport sizes.

**The presence pass (2026-07-05):** the band's TOP edge could still read as a straight clip
(unresolved facets + the pool glow against the cover's flat black) — fixed by the **presence
fade** (see the crystallisation's behaviours) + `#fracture-layer` at constant opacity 1.
Ground-seam pixel step measured across eight band stations at 1440/390 + reduced motion:
maxΔ ≤ 4, mean ≈ 0 (was max 245 with visible tonal step). The entry note and the `#b-progress`
thread glow straddle the probe rows at some stations — legitimate content, masked in the metric.

**The cabinet rework (2026-07-05):** three audits named the cabinet the site's weakest
conversion link — its specimens (marais, cipher, aeon…) were invented placeholders. Removed
entirely: the white specimen plates, their tints and stock tokens, the `deal` reveal, the
registration marks, the perspective/live tilt, and the bench drag-rail (body.js §3 retired;
`?v` bumps: tokens 9 / body.css 15 / body.js 14). In their place, the two REAL products as
**castings** (see the section order §5, the materials law, and the motion vocabulary's
*castings assemble* entry). Copy was written from the live sites, visited that day: clara's
own register ("logged before you forget"; coach-led training log — sessions, cardio, eating,
bodyweight, recovery) and under the code's own masthead numbers (5 parts · 18 chapters ·
242 figures · self-contained; "from transistor to civilization" → the fig. 08 caption's
*sand → civilization*). The generator (`gen-cabinet-shards.js`) is kept in `docs/generators/`
— local only, like the rest of the docs. Verified locally at 1440/390 + RM before deploy:
both links resolve, embers answer hover AND focus-within, keyboard order title → open per
entry with visible accent rings, zero console errors, zero horizontal overflow at 390;
`--fracture` still ramps 0→1 across the band that follows. **Re-verified live on atheric.eu
after deploy (commit 01d74dc, headed Chrome, real GPU):** every check identical; both links
200 from the browser; scroll-through of the cabinet 400 frames, avg 8.3ms, worst 16.6ms,
**zero long frames** (no rAF added — the castings are static SVG + one-shot CSS). One
follow-up (cc64396, body.css v16): ≤600px the open instrument becomes a full-measure
ledger row (`width: 100%`, space-between, verb `nowrap`) so the verb never wraps inside
its own box — re-verified live at 390: one line, 44px tall, zero overflow.

## The fresh-eyes audit pass (2026-07-04)

An external audit produced verified findings; every fix below is live and re-measured
(headed Chrome, real GPU, 1440×900 + 390×844 + 320). Two claims were measured FALSE and
left alone (see the end).

- **The hero answers narrow viewports (the launch blocker).** The hero markup is inline-styled
  and LOCKED, so its responsive law lives in `base.css` as overrides (`!important` only where
  an inline style must yield). Below **660px** the nav becomes the broadsheet's own **two-row
  title block**: logo + CTA on the first row, the three mono links centred on a hairline-ruled
  row beneath. Nothing collapses behind a toggle. Measured: nav scrollWidth == viewport at
  390 and 320 (was 463px fixed — the CTA sat fully off-screen at 320). The studio spec stacks
  its `x0n` label over its body ≤600px (`.spec__row` → 1 column).
- **The text-band exposure (contrast over the live blob).** Light control only — the shader is
  untouched and the blob is not muted. Two instruments in `base.css`: a **gently feathered
  radial scrim** (`#dark section::after`, z 3 — above the atmosphere, below the type; hidden
  while `body.craft-active`, the stage belongs to the blob) and a **glyph-snug dark halo**
  (four-layer text-shadow on the hero span/h1/p) that clamps the ground exactly at the
  letterform. Measured at the worst drift phase (band max luminance 0.94 before): effective
  worst-case contrast eyebrow-orange **5.9:1**, lede-em-orange **6.1:1**, h1 bone **17:1**
  (orange can never pass on a bright ground — the halo is the only mechanism that can hold
  AA without killing the bloom; the scrim alone is comfort, not compliance).
- **The study readouts are documents** — `text-align: left` on `.craft-panel` + `.craft-tab`
  (the dialog sits inside the hero section, whose inline centring was destroying the GLSL
  indentation). Trap: any new child of `#dark section` renumbers the craft.css
  `nth-of-type` curtain cast — the scrim is a ::after for exactly that reason.
- **The pager** (`.craft-page`, `[data-craft-prev/next]`): ‹ › chips beside the fig. counter
  in the esc-hint's grammar, 44px hit areas via ::after, arriving on the composed cadence;
  **arrow keys** page too (wrapping; overview → 01 or 05), except where a scrollable readout
  (`.craft-tab__body`, `.p-code__body`) owns them. The counter's n / 05 promise is operable.
- **Sequenced panel swaps**: `hidePanel` fades the outgoing readout (its 0.32s opacity), THEN
  removes it from layout (`PANEL_EXIT_MS` 340); `revealPanel` additionally gates on
  `state.exitUntil`. A swap can never double-expose two panels. Instant under reduced motion
  and on exit (the shell fade carries the leave).
- **The technique tab speaks the house voice** — prose lowercased (incl. "gpu", the panels'
  own precedent); mono labels stay uppercase per the voice rules.
- **The copy instrument** (`[data-copy]`, body.js §6): the begin control (`.begin__copy` —
  address + dim verb on a hairline) and the footer contact row's quiet `copy` verb copy the
  address; the verb answers **"copied"** through the folio's letterpress tick (plain swap
  under reduced motion), an `aria-live` region announces it, and the mailto stays primary.
- **Reduced motion renders on demand** (chrome-blob.js, loop plumbing only — shader
  byte-identical): under `motionQuiet` the cursor lean is parked and each frame is compared
  against the last **drawn** snapshot; identical frames skip the raymarch entirely. Measured
  live under RM emulation: **1 draw call in 4s at the hero (was ~120/s)**, 0/s at rest; the
  craft study's camera snaps cost exactly 1 draw each. `setActive(true)` invalidates the
  snapshot (the buffer was cleared while idle). **Trap:** if a new uniform ever feeds the
  shader, add it to the `drawn` compare or RM frames won't update.
- **The bench hint answers the approach** — under a fine pointer, hovering the cabinet inks
  the "drag the bench →" hint up a register (`--ink-faint` → `--ink-dim`).

Audit claims measured false, left alone: **cabinet № 04 misalignment** (all four plates sit
at identical tops — 366/366/366/366 settled; the audit screenshotted the deal mid-flight,
plate 04 deals last by design) and **missing grab cursor** (cursor: grab / grabbing shipped
on the rail since the premium polish pass).

Verified after the pass: full scroll-through 120fps (avg 8.4ms, worst 17.6ms, zero long
frames), curtain open 120fps worst 17ms, zero console errors at 1440/390/320 + RM; the
swap sequencing sampled at 60ms intervals shows no frame with two visible panels.

## The system-under-use pass (2026-07-04, D1–D4)

Four reported defects; each run against its live repro before and after (headed Chrome,
1440 + 390). Two premises were rewritten by measurement.

- **D1/D2 — the study trigger is idempotent across its transition (craft.js).** Repro: open →
  Esc → re-click within ~0.5s. Root cause (measured: the re-click lands on `.craft-frame`
  with `dialog.open` still true): through the ~0.48s exit fade the dialog stays a fullscreen
  modal in the top layer, so the re-click hits the stage/frame — never the covered trigger —
  and the stage-click handler's deselect was a no-op, so the study stayed closed. Fix: a
  stage/frame click caught while `state.closing || !state.open` routes straight to `enter()`
  (deterministic re-open, no scroll side-effect — `enter()` pins scrollY 0). `state.closing`
  is set in `exit()`, cleared in `enter()`; the close timer refuses to close a re-opened
  dialog. Enter/Space keep native `<button>` semantics — one click path, no keydown handler
  on the trigger, no divergence. Verified: opens 5/5, scrollY 0, at both widths. Trap: the
  dialog is a full-viewport modal during the fade — any "click the trigger again" path must
  assume the click lands on the dialog, not the trigger.
- **D3 — focus never leaves the study (craft.js).** Premise ("uses dialog.show(), no
  top-layer") was false — `showModal()` is used and `:modal` is true. But a real 1-tab leak
  existed: past the last focusable (the `next` pager) Chromium dropped one Tab onto `<body>`
  before wrapping. Fix: a Tab/Shift+Tab guard on the dialog wraps across its live focusables.
  Verified: Tab×15 → 0 leaks (was 1); Esc still returns focus to the trigger.
- **D4 — bench arrow keys: no change (premise did not reproduce).** The handler (body.js §3)
  works live: ArrowRight/Left scroll the rail and reach card 04 — 0→760 (=max) at 390,
  0→154 (=max) at 1440, ArrowLeft returns to 0. End/PageDown untouched; the craft readout is
  a separate element so arrows are never double-owned. Reported "arrows do nothing / scrollLeft
  stays 0" is not present on the live build. No fabricated fix (per the do-not-guess constraint).

Untouched: shader/SDF/material, the curtain choreography (the fix only re-enters its existing
open/close class toggles), the fracture. Zero console errors across every repro at both widths.

## The transfer pass (2026-07-05, commit 0fee624) — the type arrives lighter

An optimization-only pass: **zero visual or behavioral change permitted; byte-identical
rendering was the acceptance criterion** and was met (screenshot PNGs byte-equal between the
old and new build at 8 scroll stations × 1440/390, study open + fig 01, privacy, all under
reduced motion with animations frozen and the blob/clock masked identically; the only
non-equal shots reproduce in A/A control runs of the unchanged build — harness noise).

- **The fonts were quintuplicated.** The Google css2 mirror served the SAME variable-font
  bytes once per weight: all five Archivo latin woff2s md5-identical (one VF, wght 100–900),
  both JBM latin files identical, both JBM cyrillic files identical. The downloaded faces now
  share one canonical file per family/subset — the @font-face BLOCKS are untouched (same
  weights, same unicode-ranges → identical face matching), only their `src` urls collapsed.
- **The four latin/serif canonical files are subset** to the site's closed glyph set
  (printable ASCII + A0/A7/A9/B7/C4/C9/D7/E4/E9 + 2013/2014/2018/2019/201C/201D/2026/2039/203A
  — includes entity-encoded “ ” nbsp and Ä/É for uppercase-transformed ä/é). fontTools,
  `--layout-features='*' --glyph-names`. **TRAP: `--glyph-names` is load-bearing** — without
  it pyftsubset writes a nameless post table and Chrome/macOS rasterizes several glyphs
  (e s 5 8 …) a subpixel off at text sizes (found by pixel-diff; outlines/metrics/advances
  were table-identical — only the screenshots knew).
- **The cyrillic file is deduped but NOT subset** — every reduced build of it moved № a hair;
  both cyrillic faces point at the original `jetbrains-mono-400-normal-cyrillic.woff2`
  verbatim. (№ lives in the folio too — its raster shift even re-dithered the footer's
  furnace gradient at 1440.)
- **Result: fonts 318KB/11 requests → ~89KB/5 requests.** Cold page transfer 397KB → 181KB
  (−54%), 26 → 20 requests. The 40 original per-weight files stay on disk unreferenced
  (rollback + sessions holding the cached old fonts.css).
- **Sequencing:** the five font urls are `<link rel=preload>`ed (fonts now start ~196ms, was
  ~420ms — after the CSS that discovers them) and the blob module chain gets
  `<link rel=modulepreload>` for `blob.js?v=11` + `chrome-blob.js?v=11` (was discovered only
  after main.js parsed). **LAW: preload hrefs must stay byte-identical to the fonts.css src
  urls, and modulepreload hrefs to the import specifiers** (the module-cache trap extends to
  hints). Measured effect: cold CLS 0.04–0.06 → **0** at both widths (the swap never paints a
  fallback frame now); FCP/LCP *as measured* rose 528→628ms because the metric used to fire
  on the fallback-font flash — the visually-complete render moved ~870 → ~628ms (−28%).
  TBT 0 before and after. Warm loads: only the HTML re-fetches (~24KB).
- **Caching (_headers):** `/src/*` and `/fonts/*` now `public, max-age=31536000, immutable`;
  HTML deliberately keeps the platform's `max-age=0, must-revalidate`. **LAW (documented in
  _headers): never change a /src/* or /fonts/* file without bumping its ?v everywhere —
  index.html + privacy.html + 404.html + fonts.css srcs + the preload/modulepreload hints +
  the import chain.** privacy/404 carried stale stamps (tokens v7/v8, base v7) — normalized
  to index's so one bump ships everywhere; with immutable caching a stale stamp would pin a
  year-old file, not just fork the cache.
- **Dead code / SVG:** selector cross-reference (every class/id vs markup + JS-built class
  names) found dead rules only in LOCKED dark.css (~0.5KB gz — left alone); body.js §3 is
  already a comment stub. All SVGs are inline generated artifacts (hand-editing forbidden);
  HTML transfers at 24KB brotli. Nothing net-positive — deliberately not stripped.
- **The band-entry frame spike (~33–41ms, historical):** does NOT reproduce — three profiled
  runs (cold + warm first entry, DPR1 + DPR2, wheel-scrolled on real GPU), ~2300 frames,
  worst 18.7ms, zero >25ms. The heaviest one-off at entry in the trace is a **12.4ms
  worker-thread GPU raster task** — the first rasterization of the viewport-sized fixed
  layers as they become non-empty at band entry. That is the plausible mechanism of the
  historical single-frame spike (same cost landing on a contended frame). Off the main
  thread today; no riskless fix exists that beats a one-time cost — left alone per brief.
- **Owner action (dashboard, not repo):** Cloudflare's Email Address Obfuscation injects
  `email-decode.min.js` (+1 request, HTML mutation) into every page. Turning it off in the
  zone (Scrape Shield) removes it; the site's mailto links render identically without it.

## The philosophy layer (2026-07-06) — /thought, the author, careers

Three additions in one deploy, extending the broadsheet without touching the LOCKED
hero/blob/study or the fracture/cabinet machinery.

- **/thought (thought.html) — the exhibition of ideas.** One page, three theses (the owner's
  lines, typeset and minimally extended; each support paragraph must stay *paraphrasable* —
  no unfalsifiable ornament), one screen each (`min-height:100svh`, flex-centred), in order:
  `№ 01 not learned, used.` / `№ 02 weightless software.` / `№ 03 built in the right order.`
  Set directly into the permanently dark plane in the broadsheet's own grammar — drawn ticked
  rules, mono coordinate labels (`— thesis № 0n / iii`), lowercase Archivo display with the
  one italic-serif breath, Instrument Serif roman for each core line. **No blob** (the blob is
  hero-only, LOCKED); no paper objects — all ink on the plane. Thesis 02 steps off the shared
  left axis ≥861px (the score's off-measure bar). Page-owned styles live in a `<style>` block
  (CSP already allows it — the privacy.html precedent); reveals are `src/scripts/thought.js?v=1`,
  one IntersectionObserver at the body's 0.09s cadence, `.is-in` pinned on under reduced
  motion (mirrors body.js), plus a `<noscript>` override so the sheet presents fully formed
  without JS. Canonical `https://atheric.eu/thought`, og/meta mirroring index, sitemap entry.
- **The author — the coda of /thought (`#author`), linked from the footer colophon.**
  Register: mission and craft, no résumé, no mythology. "atheric is authored by one person."
  → the practice (mathematics, software, design combined into systems that reduce friction;
  first principles; every interaction must justify interrupting a human) → "this is the
  first *work*." + mono signature `yki lähteenmäki · helsinki, fi` (the name is already
  public in the imprint). Footer ledger gains `author → /thought#author`.
- **Careers — one footer ledger row.** `careers — no open positions. if you're exceptional,
  write to us.` (the existing mailto). Sits between author and legal.
- **Nav: the fourth link.** The hero nav gains `thought` (→ /thought) after cabinet — a page
  link among the three anchors; total stays restrained. The <660px two-row nav in base.css
  gains `flex-wrap:wrap` + a tighter gap clamp (`12px clamp(18px, 7vw, 40px)`) so four links
  hold one row from ~360px and wrap gracefully below — **base.css ?v=11 → 12** (bumped in
  index.html + privacy.html; 404.html does not reference base.css).

## The handcraft pass (2026-07-06) — /thought carries its own authored moments

A frame-by-frame walk of the live site at 1440 and 390 found index already saturated (every
sheet carries its authored moment — fig. 00, the gauges, the castings, the pull word-rise,
the fin-dot, the folio, the furnace) and /thought the one under-handcrafted surface: three
near-identical screens of left-set type, empty counter-fields at desktop, generic block
fades only, zero facet vocabulary. **Index deliberately untouched** (restraint governs);
three additions, all on /thought, all one-shot — the page at rest is still:

- **The thesis stones — the crystallisation's vocabulary, at rest on the ideas sheet** (the
  first use of the facet grammar outside the transitions/castings). Three small faceted
  stones (27/32/27 facets) occupy the theses' empty counter-fields ≥900px: right of № 01
  and № 03, LEFT of the off-measure № 02 (the mark counterweights the score). They **enact
  the annealing down the page**: stone i un-set metal (one warm whisper), stone ii
  mid-resolve (warm greys risen along the one diagonal grain), stone iii nearly set (one
  near-paper plate seated bottom-right). Same tone law as the band/castings (warm-biased
  `#050505`→paper ramp, station-snapped, 1px same-colour self-strokes); each assembles ONCE
  as its thesis reveals — dark facets first, warm last, per-facet `--fd` delays (~0.7s
  sweep), opacity only — then perfectly still: **no embers, no breath, nothing loops**
  (unlike the cabinet's castings, deliberately — the philosophy page rests). Generated
  artifacts: `docs/generators/gen-thesis-stones.js` (seeded, same policy as the cabinet
  generator — never hand-edit the polygons). `aria-hidden`, pointer-inert, hidden <900px.
- **The core-line word-rise.** Each thesis's serif core line — the line the page exists to
  deliver — rises **word by word** out of per-word masks (the voice pull's exact technique,
  body.js §1b ported into thought.js: spaces stay bare text nodes, kerning/breaks/resting
  render untouched; 45ms letterpress stagger). The words carry the line's group-stagger
  delay as their base, so the section cadence (index → display → core words → body) holds.
  `.t-core--split` hands the block reveal to the words. RM / no-JS: the split never
  happens — the composed paragraph stands.
- **The coda's period, set.** The author close ("this is the first *work*.") finishes with
  the homepage's final-period moment, answered on the dark plane: a beat after the line
  lands the period arrives still-molten amber (`--signal-2`, faint warm halo — glow allowed
  on the dark plane, the ledeCool grammar) and cools through the signal to resting bone
  (`tFinSet`, 2.2s, 1.2s delay). Base state is the composed one (ink) → no-JS and reduced
  motion are static.

`thought.js ?v=1 → 2` (bumped in thought.html — the page's only reference; all new CSS is
in thought.html's own `<style>` block, no shared-asset stamps touched). Verified local on
**Chrome AND WebKit** (playwright, both-engines law) × 1440/390 × full/reduced motion:
zero overflow, stones present/hidden per width, split only under full motion (21 word
masks), RM presents everything composed, no-JS composed, zero console errors; scroll-through
with reveals firing 386 frames avg 8.3ms worst 9.4ms, **zero frames >25ms**.
