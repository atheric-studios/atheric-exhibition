// dark.js — the dark build's hero behaviors, carried over from its DCLogic `setup()`
// (builds/dark/handoff/renders/atheric-v2-B-aurora-chrome.html). The original ran inside
// the design-component runtime; here it's the same DOM code as a plain module.
//
// Substrate-safe: this adds NO animation loop. transition.js owns the only rAF on the page.
// These are passive scroll/pointer listeners + one IntersectionObserver — nothing here
// touches --seam-progress, the seam pin, or the seam's loop.

function setup() {
  // Scroll-progress bar — the 2px signal line at the top of the dark overture.
  const bar = document.getElementById('b-progress');
  const onScroll = () => {
    if (!bar) return;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Staggered scroll-reveals. Carried verbatim for fidelity; a no-op for the hero overture
  // (the hero has no [data-breveal] elements — those live in the dark build's lower sections,
  // which are not mounted in the overture).
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-breveal]').forEach((el) => {
    const sibs = [...el.parentElement.querySelectorAll(':scope > [data-breveal]')];
    el.style.transitionDelay = (Math.max(0, sibs.indexOf(el)) * 0.09) + 's';
    io.observe(el);
  });

  // Magnetic CTAs.
  document.querySelectorAll('.b-cta').forEach((btn) => {
    btn.addEventListener('pointermove', (ev) => {
      const r = btn.getBoundingClientRect();
      btn.style.transform = `translate(${(ev.clientX - r.left - r.width / 2) * 0.16}px, ${(ev.clientY - r.top - r.height / 2) * 0.26}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = 'translate(0,0)'; });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}
