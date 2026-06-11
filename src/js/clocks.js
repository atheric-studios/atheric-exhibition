export function initClocks() {
  // Nav clock
  const navClock = document.getElementById('navClock');
  const fmt = (n) => String(n).padStart(2, '0');
  const tickClock = () => {
    const d = new Date();
    // en-GB, not en-FI — the FI region formats time with periods
    // (20.34.33), clashing with the markup's 00:00:00 placeholder and
    // every other clock on the page.
    const z = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(d);
    navClock.innerHTML = `<b>HEL</b> · ${z}`;
  };
  tickClock();
  setInterval(tickClock, 1000);

  // City clocks
  document.querySelectorAll('[data-tz]').forEach(node => {
    const tz = node.dataset.tz;
    const upd = () => {
      try {
        node.textContent = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
        }).format(new Date());
      } catch (e) { node.textContent = '—'; }
    };
    upd();
    setInterval(upd, 30000);
  });
}
