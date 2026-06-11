// Motion-bg — drives a permanent full-bleed iframe backdrop pinned via
// position: sticky inside its section. The figure stays at 100vw x 100vh
// while the section's content scrolls over it. Adds two layers of
// scroll-linked variance plus cursor parallax for depth:
//
//   - vignette intensity peaks at the section's midpoint (0.18 → 0.48
//     → 0.18) so the bg "breathes" with the read
//   - subtle scale breath (1.0 → 1.03 → 1.0) on the same sine curve
//   - faint vertical parallax (±15px linear across section progress)
//   - cursor-driven micro parallax (±5px, inverted so the content
//     drifts opposite the mouse — reads as "looking through a window"
//     onto something behind the page)
//
// All variables are written to the stage element so the figure +
// shell + vignette inherit them through the cascade.

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NARROW = matchMedia('(max-width: 1100px)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;

export function initMotionBg() {
  const stages = Array.from(document.querySelectorAll('[data-motion-bg-stage]'));
  if (!stages.length) return;

  // On touch / narrow viewport / reduced motion, the CSS fallback
  // collapses the bg to an inline 16:9 frame. No JS work needed.
  if (REDUCE || NARROW || COARSE) return;

  // Track which stages are near the viewport so we don't burn cycles
  // on stages far away.
  const visible = new WeakSet();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) visible.add(e.target);
      else visible.delete(e.target);
    }
  }, { rootMargin: '50% 0px 50% 0px' });

  stages.forEach((s) => io.observe(s));

  let raf = 0;
  const tick = () => {
    raf = 0;
    const vh = window.innerHeight;

    for (const stage of stages) {
      if (!visible.has(stage)) continue;

      // Progress through the sticky pin specifically: stage is taller
      // than the viewport (e.g. 200vh stage with 100vh sticky child),
      // so the pin range is stage.height - vh of scroll. p = 0 when
      // the pin first engages (stage.top hits viewport top) and p = 1
      // when it disengages (stage.bottom reaches viewport top + vh).
      const r = stage.getBoundingClientRect();
      const range = r.height - vh;
      let p = range > 0 ? -r.top / range : 0;
      if (p < 0) p = 0; else if (p > 1) p = 1;

      // sin(p * π) → 0 at edges, 1 at midpoint. Drives the vignette
      // and scale breath so both peak in the middle of the pin.
      const breath = Math.sin(p * Math.PI);

      const vignette  = 0.18 + breath * 0.30;
      const scale     = 1 + breath * 0.03;
      const parallaxY = (p - 0.5) * 30;

      stage.style.setProperty('--bg-progress', p.toFixed(4));
      stage.style.setProperty('--bg-vignette', vignette.toFixed(3));
      stage.style.setProperty('--bg-scale', scale.toFixed(4));
      stage.style.setProperty('--bg-parallax-y', parallaxY.toFixed(2) + 'px');
    }
  };

  const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  tick();

  // Cursor parallax — inverted (content moves opposite the mouse) so it
  // reads as depth rather than a sticker following the cursor. Only
  // updates while a stage is visible — otherwise it's wasted work.
  let cursorRaf = 0;
  let cursorX = 0.5;
  let cursorY = 0.5;
  const updateCursor = () => {
    cursorRaf = 0;
    const cx = (cursorX - 0.5) * -10;
    const cy = (cursorY - 0.5) * -10;
    for (const stage of stages) {
      if (!visible.has(stage)) continue;
      stage.style.setProperty('--bg-cursor-x', cx.toFixed(2) + 'px');
      stage.style.setProperty('--bg-cursor-y', cy.toFixed(2) + 'px');
    }
  };
  addEventListener('mousemove', (e) => {
    cursorX = e.clientX / window.innerWidth;
    cursorY = e.clientY / window.innerHeight;
    if (!cursorRaf) cursorRaf = requestAnimationFrame(updateCursor);
  }, { passive: true });
}
