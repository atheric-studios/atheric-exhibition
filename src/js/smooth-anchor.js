export function initSmoothAnchor() {
  // skip links that the page-transitions router handles ([data-nav-to])
  document.querySelectorAll('a[href^="#"]:not([data-nav-to])').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}
