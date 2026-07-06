// thought.js — the ideas sheet's reveals. One IntersectionObserver toggling .is-in on the
// page's drawn rules and blocks, at the broadsheet's own cadence (0.09s stagger inside
// [data-reveal-group]) so /thought and the body share one rhythm. No rAF, no state.
// Under prefers-reduced-motion everything presents fully formed (mirrors body.js).

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealables = document.querySelectorAll('[data-reveal], [data-rule]');

if (reduce) {
  revealables.forEach((el) => el.classList.add('is-in'));
} else {
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    group.querySelectorAll('[data-reveal]').forEach((el, i) => {
      el.style.transitionDelay = (i * 0.09).toFixed(2) + 's';
    });
  });

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -7% 0px' }
  );
  revealables.forEach((el) => io.observe(el));
}
