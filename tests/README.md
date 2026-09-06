# Responsive layout checks

`check-responsive.py` drives a separate local Chrome debugging session. It checks
the homepage, news archive, publication archive, service page, and photo gallery
at 17 viewport sizes (320–2560 px, including landscape and desktop → mobile →
desktop resizing) in both themes. It checks overflow, overlapping navigation and
social controls, the About illustration, photo preservation/column counts, and
mobile-menu opening, Escape, closing on navigation, and anchor clearance.

Requirements: Python 3, `websocket-client`, Google Chrome, and a local HTTP server.
Use a temporary Chrome profile, not your everyday browser profile.

From the repository root, in separate terminals:

```sh
python3 -m http.server 8766
```

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --remote-debugging-port=9333 --user-data-dir=/tmp/chahat-responsive-chrome about:blank
```

```sh
python3 tests/check-responsive.py
```

The test exits nonzero on failure. `--base` and `--port` change the local site and
debugging endpoints; `--menu-only` reruns just the menu/anchor interaction checks.
Screenshot review is still needed for typography, spacing, and general appearance.
