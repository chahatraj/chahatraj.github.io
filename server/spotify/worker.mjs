// Only the public, minimal track summary leaves this Worker. Tokens stay in secrets.
export function createHandler(fetchSpotify = fetch) {
  let accessToken;
  let tokenExpires = 0;
  let summary;
  let cacheUntil = 0;
  let pending;

  async function currentTrack(env) {
    const now = Date.now();
    if (summary && now < cacheUntil) return summary;
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_REFRESH_TOKEN) {
      return { playing: false, checkedAt: now };
    }
    if (!accessToken || now >= tokenExpires) {
      const stored = env.BUCKET ? await env.BUCKET.get('spotify-refresh-token') : null;
      const refreshToken = stored ? await stored.text() : env.SPOTIFY_REFRESH_TOKEN;
      const response = await fetchSpotify('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          ...(env.SPOTIFY_CLIENT_SECRET ? { Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}` } : {}),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: env.SPOTIFY_CLIENT_ID }),
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) throw new Error('Authorization unavailable');
      const token = await response.json();
      if (!token.access_token) throw new Error('Missing access token');
      if (token.refresh_token && env.BUCKET) await env.BUCKET.put('spotify-refresh-token', token.refresh_token);
      accessToken = token.access_token;
      tokenExpires = now + Math.max(0, (Number(token.expires_in) - 60) * 1000);
    }
    const response = await fetchSpotify('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(5000)
    });
    if (response.status === 401) accessToken = undefined;
    if (response.status === 429) {
      summary = { playing: false, checkedAt: Date.now() };
      cacheUntil = Date.now() + Math.max(15, Number(response.headers.get('Retry-After')) || 60) * 1000;
      return summary;
    }
    if (response.status !== 204 && !response.ok) throw new Error('Playback unavailable');
    const data = response.status === 204 ? null : await response.json();
    summary = { playing: false, checkedAt: Date.now() };
    const item = data?.item;
    if (data?.is_playing && data.currently_playing_type === 'track' && item?.type === 'track' &&
        !item.is_local && !data.device?.is_private_session && item.name && item.artists?.length &&
        /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+$/.test(item.external_urls?.spotify || '')) {
      summary = {
        ...summary, playing: true, title: item.name,
        artist: item.artists.map(artist => artist.name).join(', '), url: item.external_urls.spotify,
        remainingMs: Math.max(0, item.duration_ms - (data.progress_ms || 0))
      };
    }
    cacheUntil = Date.now() + Math.min(10000, summary.remainingMs ?? 10000);
    return summary;
  }

  return async function handle(request, env) {
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': 'https://chahatraj.github.io',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
    };
    if (new URL(request.url).pathname !== '/now-playing') return new Response('Not found', { status: 404 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return new Response(null, { status: 405, headers });
    try {
      if (!pending) pending = currentTrack(env).finally(() => { pending = undefined; });
      return Response.json(await pending, { headers });
    } catch {
      summary = { playing: false, checkedAt: Date.now() };
      cacheUntil = Date.now() + 10000;
      return Response.json(summary, { status: 503, headers });
    }
  };
}
export default { fetch: createHandler() };
