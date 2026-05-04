export function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;
  const fillEl = loader.querySelector('.loader-thread-fill');
  const taskEl = loader.querySelector('.loader-task');

  // three atmospheric beats — about preparation, not technical loading.
  // the loader is a waiting room, not a progress meter.
  const tasks = [
    '— preparing the room',
    '— polishing the chrome',
    '— catching the light',
  ];

  let pct = 0;
  const tick = () => {
    pct += Math.random() * 3 + 1.4;
    if (pct >= 100) pct = 100;
    if (fillEl) fillEl.style.width = pct.toFixed(1) + '%';
    if (taskEl) {
      const idx = Math.min(tasks.length - 1, Math.floor(pct / (100 / tasks.length)));
      if (taskEl.textContent !== tasks[idx]) taskEl.textContent = tasks[idx];
    }
    if (pct < 100) {
      setTimeout(tick, 70 + Math.random() * 90);
    } else {
      setTimeout(() => {
        loader.classList.add('gone');
        document.querySelectorAll('[data-hero-headline]').forEach(el => el.classList.add('reveal'));
        setTimeout(() => loader.remove(), 1000);
        // once the charIn cascade has visibly finished, lock the chars into
        // their resting state so future transitions (e.g. inspect-mode exit)
        // can fire without being suppressed by the animation's forwards fill.
        setTimeout(() => {
          document.querySelectorAll('[data-hero-headline]').forEach(el => el.classList.add('complete'));
        }, 2200);
      }, 320);
    }
  };
  setTimeout(tick, 240);
}
