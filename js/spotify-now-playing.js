(() => {
  const link = document.querySelector('[data-spotify-now-playing]');
  if (!link || !link.dataset.endpoint) return;
  const label = link.querySelector('[data-spotify-label]');
  let timer;
  let controller;
  let revision = 0;

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
          typeof track.artist !== 'string' || !track.artist.trim() ||
          url.origin !== 'https://open.spotify.com' || !/^\/track\/[A-Za-z0-9]+$/.test(url.pathname) ||
          !Number.isFinite(track.checkedAt) || Math.abs(Date.now() - track.checkedAt) > 45000) {
        hide();
      } else {
        label.textContent = `listening to ${track.title} — ${track.artist}`;
        link.href = url.href;
        link.setAttribute('aria-label', `Listen to ${track.title} by ${track.artist} on Spotify (opens in a new tab)`);
        link.hidden = false;
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
