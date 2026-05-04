export function initClocks() {
  // Nav clock
  const navClock = document.getElementById('navClock');
  const fmt = (n) => String(n).padStart(2, '0');
  const tickClock = () => {
    const d = new Date();
    const z = new Intl.DateTimeFormat('en-FI', {
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
