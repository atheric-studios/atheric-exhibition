// Nav-scroll — auto-hide the top bar on scroll-down, reveal on
// scroll-up or near the top of the page. Apple-style: the nav stays
// visible at rest, gets out of the way when reading, comes back the
// moment you reach for it.
//
// Threshold: never hide while within REVEAL_TOP px of the document
// top (so the nav is always there on first paint and after returning
// home). Direction is gated by TOLERANCE px to ignore scroll jitter
// from rubber-banding / touchpad inertia.

const REVEAL_TOP = 80;
const TOLERANCE  = 6;

export function initNavScroll() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  let lastY = window.scrollY;
  let hidden = false;
  let raf = 0;

  const tick = () => {
    raf = 0;
    const y = window.scrollY;
    const delta = y - lastY;

    // Within the top reveal zone — always show, regardless of direction.
    if (y <= REVEAL_TOP) {
      if (hidden) {
        nav.classList.remove('is-hidden');
        hidden = false;
      }
      lastY = y;
      return;
    }

    // Ignore tiny deltas — keeps scroll jitter from flickering the nav.
    if (Math.abs(delta) < TOLERANCE) return;

    if (delta > 0 && !hidden) {
      nav.classList.add('is-hidden');
      hidden = true;
    } else if (delta < 0 && hidden) {
      nav.classList.remove('is-hidden');
      hidden = false;
    }

    lastY = y;
  };

  addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });

  // Also reveal on focus (keyboard tab into a nav link from below) and
  // on mouse approach to the top edge — both feel right; the user is
  // explicitly reaching for the nav.
  addEventListener('focusin', (e) => {
    if (nav.contains(e.target) && hidden) {
      nav.classList.remove('is-hidden');
      hidden = false;
    }
  });

  addEventListener('mousemove', (e) => {
    if (e.clientY < 24 && hidden) {
      nav.classList.remove('is-hidden');
      hidden = false;
    }
  }, { passive: true });
}
