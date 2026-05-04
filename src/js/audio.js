export function initAudio() {
  const audio = document.getElementById('audio');
  audio.addEventListener('click', () => {
    const on = audio.getAttribute('aria-pressed') === 'true';
    audio.setAttribute('aria-pressed', !on);
  });
}
