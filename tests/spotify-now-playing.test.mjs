import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHandler } from '../server/spotify/worker.mjs';
const sharedBucket = { get: async key => key === 'spotify-sharing' ? { text: async () => JSON.stringify({enabled:true,expiresAt:Date.now()+3600000}) } : null };
const env = { BUCKET: sharedBucket, SPOTIFY_CLIENT_ID: 'test-id', SPOTIFY_CLIENT_SECRET: 'test-secret', SPOTIFY_REFRESH_TOKEN: 'test-refresh' };
const request = () => new Request('https://example.com/now-playing');
const playback = {
  is_playing: true, currently_playing_type: 'track', progress_ms: 1200,
  item: { type: 'track', name: '<Song>', artists: [{ name: 'Artist' }], duration_ms: 180000,
    external_urls: { spotify: 'https://open.spotify.com/track/abc123' } }
};
function fakeSpotify(data, status = 200) {
  return async url => url.includes('/api/token')
    ? Response.json({ access_token: 'private-token', expires_in: 3600 })
    : status === 204 ? new Response(null, { status }) : Response.json(data, { status });
}
test('returns only public track fields, caches concurrent reads and keeps credentials private', async () => {
  let calls = 0;
  const handle = createHandler(async (...args) => { ++calls; return fakeSpotify(playback)(...args); });
  const replies = await Promise.all([handle(request(), env), handle(request(), env)]);
  const data = await replies[0].json();
  assert.equal(data.playing, true);
  assert.equal(data.title, '<Song>');
  assert.equal(data.remainingMs, 178800);
  assert.equal(calls, 2);
  assert.deepEqual(Object.keys(data).sort(), ['artist', 'checkedAt', 'playing', 'remainingMs', 'title', 'url']);
  assert.equal(replies[0].headers.get('Access-Control-Allow-Origin'), 'https://chahatraj.github.io');
});
for (const [name, data, status] of [
  ['paused', { ...playback, is_playing: false }],
  ['nothing playing', null, 204],
  ['podcast', { ...playback, currently_playing_type: 'episode' }],
  ['local file', { ...playback, item: { ...playback.item, is_local: true } }],
  ['private session', { ...playback, device: { is_private_session: true } }],
  ['untrusted URL', { ...playback, item: { ...playback.item, external_urls: { spotify: 'https://evil.example' } } }]
]) test(`hides ${name}`, async () => {
  const response = await createHandler(fakeSpotify(data, status))(request(), env);
  assert.equal((await response.json()).playing, false);
});
test('missing configuration and upstream errors fail closed', async () => {
  assert.equal((await (await createHandler()(request(), {})).json()).playing, false);
  const response = await createHandler(async () => { throw new Error('secret error'); })(request(), env);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).playing, false);
});
test('honors Spotify rate-limit backoff', async () => {
  let calls = 0;
  const handle = createHandler(async url => {
    ++calls;
    return url.includes('/api/token') ? Response.json({ access_token: 'token', expires_in: 3600 }) :
      new Response(null, { status: 429, headers: { 'Retry-After': '120' } });
  });
  await handle(request(), env); await handle(request(), env);
  assert.equal(calls, 2);
});
async function frontend(data, reject = false) {
  const label = { textContent: '' };
  const link = { hidden: true, dataset: { endpoint: 'https://example.com/now-playing' },
    querySelector: () => label, setAttribute(k, v) { this[k] = v; }, removeAttribute(k) { delete this[k]; } };
  const context = { URL, Date, Number, Math, AbortController, clearTimeout() {}, setTimeout() { return 1; },
    document: { hidden: false, querySelector: () => link, addEventListener() {} }, window: { addEventListener() {} },
    fetch: async () => { if (reject) throw new Error(); return { ok: true, json: async () => data }; } };
  vm.runInNewContext(readFileSync('js/spotify-now-playing.js', 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  return { link, label };
}
test('frontend safely displays track text and opens the Spotify track', async () => {
  const { link, label } = await frontend({ playing: true, title: '<script>song</script>', artist: 'Artist',
    url: 'https://open.spotify.com/track/abc123', checkedAt: Date.now() });
  assert.equal(link.hidden, false);
  assert.equal(label.textContent, 'listening to <script>song</script>');
  assert.equal(link.href, 'https://open.spotify.com/track/abc123');
});
test('frontend hides stale, paused, malformed and failed responses', async () => {
  for (const data of [null, {}, { playing: false }, { playing: true, title: 'Song', artist: 'Artist',
    url: 'https://open.spotify.com/track/abc123', checkedAt: Date.now() - 60000 }]) {
    assert.equal((await frontend(data)).link.hidden, true);
  }
  assert.equal((await frontend({}, true)).link.hidden, true);
});
test('PKCE refresh works without a client secret and persists rotated refresh tokens privately', async () => {
  let saved;
  const handle = createHandler(async (url, options) => {
    if (url.includes('/api/token')) {
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.body.get('client_id'), 'test-id');
      assert.equal(options.body.get('refresh_token'), 'stored-refresh');
      return Response.json({ access_token: 'access', refresh_token: 'rotated-refresh', expires_in: 3600 });
    }
    return Response.json(playback);
  });
  const response = await handle(request(), { SPOTIFY_CLIENT_ID: 'test-id', SPOTIFY_REFRESH_TOKEN: 'initial-refresh',
    BUCKET: { get: async key => key === 'spotify-sharing' ? sharedBucket.get(key) : ({ text: async () => 'stored-refresh' }), put: async (key, value) => { saved = [key, value]; } } });
  assert.equal((await response.json()).playing, true);
  assert.deepEqual(saved, ['spotify-refresh-token', 'rotated-refresh']);
});
const ownerHeaders = { 'oai-authenticated-user-id': 'owner-id', 'oai-authenticated-user-email': 'owner@example.com', Origin: 'https://example.com', 'Content-Type': 'application/json' };
function privateEnv(initial) {
  let setting = initial;
  return { ...env, SPOTIFY_OWNER_EMAIL: 'owner@example.com', BUCKET: {
    get: async key => key === 'spotify-sharing' && setting ? { text: async () => JSON.stringify(setting) } : null,
    put: async (key, value) => { if (key === 'spotify-sharing') setting = JSON.parse(value); }
  } };
}
test('sharing defaults off, expired sharing stays off, and no Spotify request is made', async () => {
  for (const initial of [undefined, {enabled:false,expiresAt:Date.now()+100000}, {enabled:true,expiresAt:Date.now()-1}]) {
    const handle = createHandler(async () => { assert.fail('Must not contact Spotify while private'); });
    const result = await (await handle(request(), privateEnv(initial))).json();
    assert.equal(result.playing, false);
    assert.equal(result.title, undefined);
  }
});
test('anonymous and other signed-in users cannot read or change sharing', async () => {
  const handle = createHandler();
  const environment = privateEnv();
  assert.equal((await handle(new Request('https://example.com/control'), environment)).status, 302);
  assert.equal((await handle(new Request('https://example.com/sharing'), environment)).status, 401);
  for (const headers of [{}, {...ownerHeaders,'oai-authenticated-user-email':'intruder@example.com'}]) {
    const response = await handle(new Request('https://example.com/sharing', {method:'POST',headers,body:JSON.stringify({enabled:true})}), environment);
    assert.ok([401,403].includes(response.status));
  }
});
test('owner toggle persists, expires in an hour, and off suppresses a cached track', async () => {
  const environment = privateEnv();
  const handle = createHandler(fakeSpotify(playback));
  const change = enabled => handle(new Request('https://example.com/sharing', {method:'POST',headers:ownerHeaders,body:JSON.stringify({enabled})}), environment);
  const enabled = await (await change(true)).json();
  assert.equal(enabled.enabled, true);
  assert.ok(enabled.expiresAt-Date.now() <= 3600000);
  assert.equal((await (await handle(request(),environment)).json()).playing,true);
  assert.equal((await (await change(false)).json()).enabled,false);
  const hidden = await (await handle(request(),environment)).json();
  assert.equal(hidden.playing,false);assert.equal(hidden.title,undefined);
});
test('owner writes reject cross-origin requests, non-JSON requests and invalid values', async () => {
  const handle=createHandler();const environment=privateEnv();
  for(const headers of [{...ownerHeaders,Origin:'https://evil.example'},{...ownerHeaders,'Content-Type':'text/plain'}]) {
    assert.equal((await handle(new Request('https://example.com/sharing',{method:'POST',headers,body:'{"enabled":true}'}),environment)).status,403);
  }
  assert.equal((await handle(new Request('https://example.com/sharing',{method:'POST',headers:ownerHeaders,body:'{"enabled":"true"}'}),environment)).status,400);
});
test('storage failure fails closed without revealing cached playback', async () => {
  const handle=createHandler(fakeSpotify(playback));
  const response=await handle(request(),{...env,BUCKET:{get:async()=>{throw Error('down');}}});
  assert.equal((await response.json()).playing,false);
});
