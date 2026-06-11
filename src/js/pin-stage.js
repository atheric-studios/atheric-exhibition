// Pin-stage — drives a sticky scroll-lock for [data-pin-stage] sections
// containing a [data-pin-target] frame.
//
// The HTML pattern:
//   <div data-pin-stage class="triptych-pin">     <-- runway = 300vh
//     <div class="triptych-pin__hold">             <-- position: sticky; top: 0
//       <figure data-pin-target>...</figure>
//     </div>
//   </div>
//   <div class="triptych-grid">...</div>           <-- transformed sibling
//
// Three-phase pin (Apple-style scroll lock):
//
//   1. APPROACH + GROW   The figure scales 0.64 → 1.0 as the user scrolls
//                        toward + just past the lock point. Driven by r.top
//                        independently of pin-progress so the grow reads as
//                        one continuous motion, not a step at engagement.
//
//   2. HOLD              Figure is full-bleed and pinned (sticky); the
//                        scroll absorbs HOLD_VH (1.0vh) with no visual
//                        change. Forces the user to watch the motion.
//
//   3. HAND-OFF          The next section (.triptych-grid) translates up
//                        over the still-pinned figure across HANDOFF_VH
//                        (1.0vh) of scroll. Driven by --pin-handoff (0..1)
//                        which is computed from raw scroll distance and
//                        then *lerp-smoothed* per-frame, so a fast fling
//                        leaves a visible 200–300ms tail rather than a
//                        snap. The grid carries a soft drop-shadow above
//                        its top edge that casts onto the figure beneath
//                        — that shadow is what sells the depth: it's how
//                        the eye knows the grid is moving over the figure
//                        rather than the figure scrolling away.
//
// Phase lengths are encoded in the runway geometry (CSS): runway height
// = HOLD_VH + HANDOFF_VH + 1vh, grid margin-top = -100vh. If you tune
// HOLD_VH or HANDOFF_VH here, also update .triptych-pin height in CSS.
//
// --pin-progress / --pin-scale-up / --pin-engaged are written to the
// stage so __hold + the figure inherit via the cascade. --pin-handoff
// is written to the grid directly (it's a sibling, not a descendant).
//
// Falls back to inline rendering on touch / narrow viewport / reduced
// motion — sticky-with-scroll-jacking is genuinely hostile on those.

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NARROW = matchMedia('(max-width: 1100px)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;

// Scale-up runway, expressed as r.top in units of vh. Starts during
// approach (positive) and finishes a hair into the lock (negative).
const SCALE_START_VH = 0.32;
const SCALE_END_VH   = -0.06;

// Hold + hand-off lengths, in vh of scroll distance. Pin-distance must
// equal HOLD_VH + HANDOFF_VH (encoded in the CSS runway height).
const HOLD_VH    = 1.0;
const HANDOFF_VH = 1.0;

// Lerp factor for the smoothed hand-off value. Each frame the rendered
// value chases the scroll-driven target by this fraction. 0.12 reaches
// 95% of target in ~25 frames (~400ms at 60fps) — fast enough to feel
// connected to scroll, slow enough to absorb a fling into a visible
// slide instead of a snap.
const LERP_FACTOR = 0.12;

const ENGAGE_RAMP = 0.03;

// Corner radius is fixed at 12px throughout (matches macOS Big Sur
// window radius). The "round → sharp" effect at full bleed is optical:
// the hold's ink backdrop fades in with --pin-scale-up to match the
// shell's bg, so the rounded corner pie-slices blend into the surround
// and become invisible. No geometry change required.

const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

export function initPinStage() {
  const stages = Array.from(document.querySelectorAll('[data-pin-stage]'));
  if (!stages.length) return;

  // Static fallback — collapse the runway, let the figure inline.
  if (REDUCE || NARROW || COARSE) {
    stages.forEach((s) => s.classList.add('is-static'));
    return;
  }

  // Track which stages are near the viewport so we don't burn cycles
  // measuring rects for elements far away.
  const visible = new WeakSet();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) visible.add(e.target);
      else visible.delete(e.target);
    }
  }, { rootMargin: '25% 0px 25% 0px' });
  stages.forEach((s) => io.observe(s));

  // Per-stage state for the lerp smoothing on --pin-handoff.
  const stageState = new WeakMap();

  let raf = 0;
  const tick = () => {
    raf = 0;
    const vh = window.innerHeight;
    let stillSmoothing = false;

    for (const stage of stages) {
      if (!visible.has(stage)) continue;
      const target = stage.querySelector('[data-pin-target]');
      if (!target) continue;

      const r = stage.getBoundingClientRect();
      const pinDistance = r.height - vh;
      const grid = stage.nextElementSibling;
      const hasGrid = grid && grid.classList.contains('triptych-grid');

      if (pinDistance <= 0) {
        stage.style.setProperty('--pin-progress', '0');
        stage.style.setProperty('--pin-scale-up', '0');
        stage.style.setProperty('--pin-engaged', '0');
        if (hasGrid) grid.style.setProperty('--pin-handoff', '0');
        continue;
      }

      // -r.top is how far we've scrolled into the runway, in px.
      const scrollIntoLock = -r.top < 0 ? 0 : -r.top;

      // pin-progress is normalised over the whole pin distance — used
      // for the engagement cue + the hairline progress bar.
      let p = scrollIntoLock / pinDistance;
      if (p > 1) p = 1;

      // Engagement: ramps to 1 quickly so the hairline + cue appear
      // immediately when the lock takes hold.
      const engaged = p <= 0
        ? 0
        : p >= ENGAGE_RAMP ? 1 : p / ENGAGE_RAMP;

      // Scale-up: driven by the stage's r.top (its top relative to the
      // viewport top), not pin-progress. Starts during the approach
      // (r.top still positive — section scrolling normally) and finishes
      // a hair into the lock so the gesture reads as one continuous
      // grow-and-settle, not a step-change at engagement.
      const scaleStart = SCALE_START_VH * vh;
      const scaleEnd   = SCALE_END_VH   * vh;
      let scaleT = (scaleStart - r.top) / (scaleStart - scaleEnd);
      if (scaleT < 0) scaleT = 0; else if (scaleT > 1) scaleT = 1;
      const scaleUp = easeInOutSine(scaleT);

      // Hand-off target: 0 throughout the hold; 0..1 across the hand-off
      // zone. Computed from raw scroll distance so the phase lengths are
      // constant in vh regardless of viewport size.
      const handoffStart = HOLD_VH * vh;
      const handoffSpan  = HANDOFF_VH * vh;
      let handoffTarget = (scrollIntoLock - handoffStart) / handoffSpan;
      if (handoffTarget < 0) handoffTarget = 0;
      else if (handoffTarget > 1) handoffTarget = 1;

      // Lerp toward the target. The state object holds the smoothed
      // value across frames so a fling produces a visible tail rather
      // than a snap. If we're still smoothing (rendered hasn't reached
      // target), schedule another rAF after this tick — the next frame
      // continues the lerp even if no scroll event fires.
      let st = stageState.get(stage);
      if (!st) { st = { handoff: handoffTarget }; stageState.set(stage, st); }
      st.handoff += LERP_FACTOR * (handoffTarget - st.handoff);
      if (Math.abs(handoffTarget - st.handoff) > 0.001) stillSmoothing = true;
      else st.handoff = handoffTarget;

      stage.style.setProperty('--pin-progress', p.toFixed(4));
      stage.style.setProperty('--pin-scale-up', scaleUp.toFixed(4));
      stage.style.setProperty('--pin-engaged', engaged.toFixed(4));
      if (hasGrid) grid.style.setProperty('--pin-handoff', st.handoff.toFixed(4));
    }

    if (stillSmoothing) raf = requestAnimationFrame(tick);
  };

  const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  tick();
}
