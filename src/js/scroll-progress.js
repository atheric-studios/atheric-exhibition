export function initScrollProgress() {
  const progress = document.getElementById('progress');
  let scrollPct = 0;
  addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollPct = Math.min(1, Math.max(0, scrollY / Math.max(1, max)));
    progress.style.width = (scrollPct * 100) + '%';
  }, { passive: true });
}
