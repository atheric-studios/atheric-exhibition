// Motion-embed — reveal entry + scroll-linked variance for [data-motion-embed]
// frames. The inner .motion-frame__shell carries the scroll variance via CSS
// custom properties so it doesn't fight the outer reveal transform.
//
// Variance vocabulary (Apple / wristwatch-house cadence):
//   - subtle parallax against scroll (±18px)
//   - micro-scale falloff at viewport edges (-1.4% max)
//   - vignette intensity tied to distance-from-center (0.18 → 0.42)

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initMotionEmbed() {
  const frames = Array.from(document.querySelectorAll('[data-motion-embed]'));
  if (!frames.length) return;

  // Reveal observer — adds .in once the frame crosses into view, marks it
  // active so the scroll-variance loop will track it. Stays observed so we
  // can flip data-active off when it leaves the viewport again (no need to
  // burn cycles on frames the user can't see).
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        e.target.dataset.active = '1';
      } else {
        delete e.target.dataset.active;
      }
    }
  }, { threshold: [0, 0.05], rootMargin: '20% 0px 20% 0px' });

  frames.forEach((f) => io.observe(f));

  if (REDUCE) return;

  let raf = 0;
  const tick = () => {
    raf = 0;
    const vh = window.innerHeight;
    const halfVh = vh * 0.5;

    for (const f of frames) {
      if (f.dataset.active !== '1') continue;
      // Pinned frames are owned by pin-stage.js — its --pin-* vars drive
      // the scale and dim. Bg frames are owned by motion-bg.js — its
      // --bg-* vars drive the sticky full-bleed variance. Don't fight
      // either with the standard parallax variance here.
      if (f.classList.contains('motion-frame--pinned')) continue;
      if (f.classList.contains('motion-frame--bg')) continue;

      const r = f.getBoundingClientRect();
      const center = r.top + r.height * 0.5;

      // -1 (frame center just below viewport) → 0 (centered) → +1 (just above)
      const span = halfVh + r.height * 0.5;
      let t = (center - halfVh) / span;
      if (t < -1) t = -1; else if (t > 1) t = 1;

      // Soft easing so the variance is just-noticeable, not show-offy.
      const ease = t * (1 - 0.18 * t * t);

      const ty = -ease * 18;                   // ±18px parallax against scroll
      const sc = 1 - Math.abs(ease) * 0.014;   // -1.4% scale at the edges
      const vn = 0.18 + Math.abs(ease) * 0.24; // vignette 0.18 → 0.42

      // Vars are declared on .motion-frame and cascade into __shell + vignette.
      f.style.setProperty('--mf-ty', ty.toFixed(2) + 'px');
      f.style.setProperty('--mf-scale', sc.toFixed(4));
      f.style.setProperty('--mf-vignette', vn.toFixed(3));
    }
  };

  const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  tick();
}
