export function initCabinetFilter() {
  const filterBtns = document.querySelectorAll('.filter button');
  const specimens = document.querySelectorAll('.specimen');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const f = btn.dataset.filter;
      specimens.forEach(s => {
        const cat = s.dataset.cat;
        const show = f === 'all' || cat === f;
        s.style.opacity = show ? '1' : '0.18';
        s.style.filter = show ? 'none' : 'grayscale(0.6)';
        s.style.pointerEvents = show ? '' : 'none';
      });
    });
  });
}
