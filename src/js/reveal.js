export function initReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        if (e.target.classList.contains('reveal')) {
          // already animates on its own via CSS
        }
        if (e.target.matches('.manifesto blockquote')) {
          e.target.classList.add('reveal');
        }
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-reveal], .manifesto blockquote').forEach(el => obs.observe(el));
}
