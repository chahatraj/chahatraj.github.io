(() => {
  const link = document.querySelector('[data-spotify-now-playing]');
  if (!link || !link.dataset.endpoint) return;
  const label = link.querySelector('[data-spotify-label]');
  const copy = link.querySelector('[data-spotify-copy]');
  let timer;
  let controller;
  let revision = 0;

  function typeLine() {
    if (!copy || !Intl.Segmenter || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let position = 0;
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    for (const part of copy.querySelectorAll('[data-spotify-text]')) {
      const characters = Array.from(segmenter.segment(part.textContent), item => {
        const character = document.createElement('span');
        character.className = 'spotify-character';
        character.textContent = item.segment;
        character.style.setProperty('--spotify-delay', `${position++ * 45}ms`);
        return character;
      });
      part.replaceChildren(...characters);
    }
  }

  function hide() {
    link.hidden = true;
    link.removeAttribute('href');
    link.removeAttribute('aria-label');
    label.textContent = '';
  }

  async function update() {
    clearTimeout(timer);
    if (document.hidden) return;
    const current = ++revision;
    controller?.abort();
    const activeController = new AbortController();
    controller = activeController;
    const timeout = setTimeout(() => activeController.abort(), 8000);
    let delay = 15000;
    try {
      const response = await fetch(link.dataset.endpoint, {
        signal: activeController.signal, credentials: 'omit', cache: 'no-store'
      });
      if (!response.ok) throw new Error('Unavailable');
      const track = await response.json();
      if (current !== revision) return;
      const url = new URL(track.url || 'https://invalid.local');
      if (!track.playing || typeof track.title !== 'string' || !track.title.trim() ||
          url.origin !== 'https://open.spotify.com' || !/^\/track\/[A-Za-z0-9]+$/.test(url.pathname) ||
          !Number.isFinite(track.checkedAt) || Math.abs(Date.now() - track.checkedAt) > 45000) {
        hide();
      } else {
        const changed = link.hidden || link.href !== url.href || label.textContent !== track.title;
        if (changed) label.textContent = track.title;
        link.href = url.href;
        link.setAttribute('aria-label', `Listen to ${track.title} on Spotify (opens in a new tab)`);
        link.hidden = false;
        if (changed) typeLine();
        if (Number.isFinite(track.remainingMs)) delay = Math.min(delay, Math.max(2000, track.remainingMs));
      }
    } catch {
      if (current === revision) hide();
    } finally {
      clearTimeout(timeout);
      if (current === revision && !document.hidden) timer = setTimeout(update, delay);
    }
  }

  document.addEventListener('visibilitychange', () => {
    ++revision;
    clearTimeout(timer);
    controller?.abort();
    hide();
    if (!document.hidden) update();
  });
  window.addEventListener('pagehide', () => {
    ++revision;
    clearTimeout(timer);
    controller?.abort();
    hide();
  });
  window.addEventListener('pageshow', update);
  update();
})();
