const CONTROL_PAGE = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spotify sharing</title>
<style>body{margin:0;background:#f5f2ec;color:#403832;font:16px/1.6 system-ui;display:grid;min-height:100vh;place-items:center}main{max-width:440px;padding:32px}h1{font-size:25px}button{border:0;border-radius:8px;background:#403832;color:white;padding:13px 20px;font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #267841;outline-offset:4px}button:disabled{opacity:.5;cursor:wait}p{color:#6b6259}#status{font-weight:600;color:#403832}</style>
<main><h1>Your Spotify sharing</h1><p id="status" role="status">Checking sharing…</p><button id="toggle" disabled>Loading…</button><p id="detail">Only you can change this setting.</p><p>Sharing stays on until you stop it. When off, your website and its public endpoint reveal no track information. Visitors who already have the page open will see the line disappear on its next update.</p></main>
<script>
let enabled=false;const button=document.querySelector('#toggle'),status=document.querySelector('#status'),detail=document.querySelector('#detail');
function render(data){enabled=data.enabled;status.textContent=enabled?'Sharing is on':'Sharing is off';button.textContent=enabled?'Stop sharing':'Start sharing';detail.textContent=enabled?'Your current song is visible until you stop sharing.':'Your listening activity is private.';button.disabled=false;}
async function refresh(){try{const r=await fetch('/sharing',{cache:'no-store'});if(!r.ok)throw Error();render(await r.json());}catch{status.textContent='Could not check sharing. Reload this page.';button.disabled=true;}}
button.onclick=async()=>{button.disabled=true;try{const r=await fetch('/sharing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:!enabled})});if(!r.ok)throw Error();render(await r.json());}catch{status.textContent='Change not confirmed. Reload to check the setting.';button.disabled=true;}};
refresh();setInterval(()=>{if(!document.hidden)refresh();},15000);
</script></html>`;

async function sharingState(env) {
  if (!env.BUCKET) throw new Error('Storage unavailable');
  const stored = await env.BUCKET.get('spotify-sharing');
  if (!stored) return { enabled: true };
  const value = JSON.parse(await stored.text());
  return { enabled: value.enabled === true };
}

async function control(request, env) {
  const url = new URL(request.url);
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" };
  // These identity headers are supplied by the Sites authentication gateway.
  const signedIn = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  if (!signedIn) {
    if (url.pathname === '/control' && request.method === 'GET') return new Response(null, { status: 302, headers: { ...headers, Location: '/signin-with-chatgpt?return_to=%2Fcontrol' } });
    return new Response('Sign in required', { status: 401, headers });
  }
  if (!env.SPOTIFY_OWNER_EMAIL || email?.toLowerCase() !== env.SPOTIFY_OWNER_EMAIL.toLowerCase()) return new Response('Owner access only', { status: 403, headers });
  if (url.pathname === '/control') return request.method === 'GET' ? new Response(CONTROL_PAGE, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } }) : new Response(null, { status: 405, headers });
  try {
    if (request.method === 'GET') return Response.json(await sharingState(env), { headers });
    if (request.method !== 'POST') return new Response(null, { status: 405, headers });
    if (request.headers.get('Origin') !== url.origin || request.headers.get('Content-Type') !== 'application/json') return new Response('Invalid origin', { status: 403, headers });
    const body = await request.json();
    if (typeof body.enabled !== 'boolean') return new Response('Invalid setting', { status: 400, headers });
    if (!env.BUCKET) throw new Error('Storage unavailable');
    const setting = { enabled: body.enabled };
    await env.BUCKET.put('spotify-sharing', JSON.stringify(setting));
    return Response.json(setting, { headers });
  } catch { return new Response('Sharing setting unavailable', { status: 503, headers }); }
}

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
    const path = new URL(request.url).pathname;
    if (path === '/control' || path === '/sharing') return control(request, env);
    if (path !== '/now-playing') return new Response('Not found', { status: 404 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return new Response(null, { status: 405, headers });
    try {
      if (!(await sharingState(env)).enabled) {
        summary = undefined; cacheUntil = 0;
        return Response.json({ playing: false, checkedAt: Date.now() }, { headers });
      }
      if (!pending) pending = currentTrack(env).finally(() => { pending = undefined; });
      const result = await pending;
      // Recheck after Spotify responds so a concurrent stop does not disclose a track.
      if (!(await sharingState(env)).enabled) return Response.json({ playing: false, checkedAt: Date.now() }, { headers });
      return Response.json(result, { headers });
    } catch {
      summary = { playing: false, checkedAt: Date.now() };
      cacheUntil = Date.now() + 10000;
      return Response.json(summary, { status: 503, headers });
    }
  };
}
export default { fetch: createHandler() };
