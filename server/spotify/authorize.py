"""One-time local Spotify PKCE authorization. Never prints credentials."""
import base64
import hashlib
import http.server
import json
import os
from pathlib import Path
import secrets
import sys
import time
import urllib.parse
import urllib.request

client_id = sys.argv[1] if len(sys.argv) == 2 else input('Spotify Client ID: ').strip()
if not client_id.isalnum():
    raise SystemExit('Invalid Client ID')
redirect = 'http://127.0.0.1:8767/callback'
state = secrets.token_urlsafe(32)
verifier = secrets.token_urlsafe(64)
challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
authorize_url = 'https://accounts.spotify.com/authorize?' + urllib.parse.urlencode({
    'client_id': client_id, 'response_type': 'code', 'redirect_uri': redirect,
    'scope': 'user-read-currently-playing', 'state': state,
    'code_challenge_method': 'S256', 'code_challenge': challenge
})
complete = False

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Callback codes must not appear in access logs.

    def reply(self, status, text):
        self.send_response(status)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.end_headers()
        self.wfile.write(text.encode())

    def do_GET(self):
        global complete
        url = urllib.parse.urlparse(self.path)
        if self.headers.get('Host') != '127.0.0.1:8767':
            return self.reply(403, 'Invalid host')
        if url.path == '/':
            return self.reply(200, '<title>Connect Spotify</title><h1>Connect Spotify to your website</h1>'
                '<p>Allow your website to show the song you are currently playing. '
                'This only requests read access to your current playback.</p>'
                '<a href="' + authorize_url.replace('&', '&amp;') + '">Continue to Spotify</a>')
        if url.path != '/callback':
            return self.reply(404, 'Not found')
        params = urllib.parse.parse_qs(url.query)
        if not secrets.compare_digest(params.get('state', [''])[0], state):
            return self.reply(400, 'Invalid authorization state. Start again from the connection page.')
        if 'error' in params or 'code' not in params:
            return self.reply(400, 'Authorization was not completed. You can return to the connection page to retry.')
        try:
            data = urllib.parse.urlencode({'client_id': client_id, 'grant_type': 'authorization_code',
                'code': params['code'][0], 'redirect_uri': redirect, 'code_verifier': verifier}).encode()
            req = urllib.request.Request('https://accounts.spotify.com/api/token', data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'})
            with urllib.request.urlopen(req, timeout=15) as response:
                token = json.load(response)
            if not token.get('refresh_token'):
                raise ValueError('Missing refresh token')
            target = Path(__file__).parent / '.dev.vars'
            fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            os.fchmod(fd, 0o600)
            with os.fdopen(fd, 'w') as out:
                out.write('SPOTIFY_CLIENT_ID=' + json.dumps(client_id) + '\n')
                out.write('SPOTIFY_REFRESH_TOKEN=' + json.dumps(token['refresh_token']) + '\n')
            self.reply(200, '<title>Spotify connected</title><h1>Spotify authorization complete</h1>'
                '<p>You can close this tab. The website connection can now be activated.</p>')
            print('Authorization complete. Credentials saved privately; no secrets printed.', flush=True)
            complete = True
        except Exception:
            self.reply(502, 'Could not complete authorization. Please restart the connection flow.')

server = http.server.HTTPServer(('127.0.0.1', 8767), Handler)
server.timeout = 1
print('Open http://127.0.0.1:8767/ to connect Spotify. This link expires in 15 minutes.', flush=True)
deadline = time.monotonic() + 900
while not complete and time.monotonic() < deadline:
    server.handle_request()
server.server_close()
if not complete:
    print('Authorization window expired; run again to retry.', flush=True)
