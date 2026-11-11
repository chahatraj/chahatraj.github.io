# Spotify now playing

The homepage's `data-spotify-now-playing` link stays hidden until its
`data-endpoint` has been configured and returns fresh, active track data.
No Spotify credential belongs in the public HTML, JavaScript, or Git history.

The Worker serves `GET /now-playing`. It returns only playback status,
track title, artist, Spotify link, check time, and remaining duration.
It caches upstream reads briefly, honors Spotify rate-limit backoff, and
hides paused, unavailable, local-file, and non-track playback. Private
session information is also respected when Spotify provides it.

## Connect

1. Create a Spotify developer app with the Web API enabled and redirect URI
   `http://127.0.0.1:8767/callback`.
2. Run `python3 server/spotify/authorize.py CLIENT_ID` and open the local URL.
   Review and approve Spotify's `user-read-currently-playing` permission.
   The helper uses PKCE and stores the refresh token in ignored `.dev.vars`
   with owner-only filesystem permissions. No Client Secret is required.
3. Configure backend runtime secrets `SPOTIFY_CLIENT_ID` and
   `SPOTIFY_REFRESH_TOKEN`. Do not copy `.dev.vars` into the hosted source.
4. Deploy `worker.mjs` as a Worker ES module. Configure a private R2 binding
   named `BUCKET` to preserve any refresh-token rotation across restarts.
   There is no route exposing the bucket or credentials.
5. Set the homepage link's `data-endpoint` to the deployed `/now-playing` URL.
6. Verify an actual playing track and a paused state before calling it live.

The current backend project is `appgprj_6af3f42380b481918b409307446b7a3e`.
Its separate Sites checkout is `website-workbench/spotify-backend` (ignored).
The GitHub Pages site remains the website frontend.

Run checks: `node --test tests/spotify-now-playing.test.mjs`.
Reauthorize after revoking the app or replacing the Spotify account. Clear the
private bucket's `spotify-refresh-token` object when replacing credentials.
