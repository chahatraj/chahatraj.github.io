"""Responsive regression checks against a local Chrome debugging session.

Requires websocket-client. Serve the site locally and run Chrome headless with
--remote-debugging-port=9333 and a temporary --user-data-dir before running this.
"""
import argparse
import json
import urllib.request

import websocket

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://localhost:8766')
parser.add_argument('--port', type=int, default=9333)
parser.add_argument('--menu-only', action='store_true')
args = parser.parse_args()
tabs = json.load(urllib.request.urlopen(f'http://localhost:{args.port}/json'))
tab = next(t for t in tabs if t['type'] == 'page')
ws = websocket.create_connection(tab['webSocketDebuggerUrl'], suppress_origin=True, timeout=25)
sequence = 0


def command(method, params=None):
    global sequence
    sequence += 1
    ws.send(json.dumps({'id': sequence, 'method': method, 'params': params or {}}))
    while True:
        result = json.loads(ws.recv())
        if result.get('id') == sequence:
            if 'error' in result:
                raise RuntimeError(result['error'])
            return result.get('result', {})


def evaluate(expression):
    result = command('Runtime.evaluate', {'expression': expression, 'awaitPromise': True,
                                         'returnByValue': True})
    if 'exceptionDetails' in result:
        raise RuntimeError(result['exceptionDetails'])
    return result['result'].get('value')


settle = '''new Promise(resolve => requestAnimationFrame(() =>
  requestAnimationFrame(() => setTimeout(resolve, 80))))'''
audit = '''(() => {
 const errors = [], width = innerWidth;
 const rect = e => e.getBoundingClientRect();
 const visible = e => e && rect(e).width && rect(e).height && getComputedStyle(e).visibility !== 'hidden';
 const overlaps = (a,b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
 if (document.documentElement.scrollWidth > width + 1) errors.push('horizontal page overflow');
 const header = document.querySelector('#colorlib-aside');
 if (header) {
   const style = getComputedStyle(header);
   if (style.overflowX !== 'visible' || style.overflowY !== 'visible')
     errors.push('navigation retains scroll-container styles');
   if (header.scrollWidth > header.clientWidth + 1) errors.push('horizontal navigation overflow');
 }
 const selectors = '.author-info,.home-name,.home-title,.home-pronunciation,.home-bio,.job-market-box,.news-item,.publication-paper,.service-item,.tile,.site-footer-note';
 document.querySelectorAll(selectors).forEach(e => {
   if (!visible(e) || e.closest('[hidden]')) return;
   const r = rect(e);
   if (r.left < -1 || r.right > width + 1 || e.scrollWidth > e.clientWidth + 2)
     errors.push('overflow: ' + e.className + ' ' + e.textContent.trim().slice(0,30));
 });
 const toggle = document.querySelector('.theme-toggle');
 document.querySelectorAll('#colorlib-main-menu a').forEach(a => {
   if (visible(a) && visible(toggle) && overlaps(rect(a),rect(toggle))) errors.push('nav overlaps theme toggle');
 });
 const social = Array.from(document.querySelectorAll('.home-profile .ftco-social a'));
 social.forEach((a,i) => {if(i && overlaps(rect(a),rect(social[i-1]))) errors.push('social icons overlap');});
 const doodle = document.querySelector('.community-doodle');
 if (visible(doodle)) document.querySelectorAll('.home-intro h1,.home-intro p').forEach(e => {
   if(overlaps(rect(e),rect(doodle))) errors.push('people doodle overlaps intro text');
 });
 document.querySelectorAll('.gallery').forEach(g => {
   const actual = g.querySelectorAll('.gallery-column').length;
   const expected = width <= 576 ? 1 : width <= 992 ? 2 : 3;
   if(actual !== expected) errors.push('gallery column mismatch: ' + actual + '/' + expected);
   const tiles = Array.from(g.querySelectorAll('.tile'));
   if(tiles.length !== 27 || new Set(tiles.map(t=>t.dataset.stillOrder)).size !== 27) errors.push('gallery lost/duplicated photos');
 });
 return errors;
})()'''

failures = []
checks = 0
sizes = [(2560,1080),(1920,1080),(1440,900),(1280,800),(1024,768),(993,800),
         (992,800),(900,900),(768,900),(767,900),(577,900),(576,900),(390,844),
         (320,640),(844,390),(1024,768),(1600,900)]
for page in ([] if args.menu_only else ['/', '/news.html', '/publications.html', '/services.html', '/stills.html']):
    command('Page.navigate', {'url': args.base + page})
    evaluate('''new Promise((resolve,reject) => {
      const deadline=Date.now()+18000;
      function ready(){
        const hosts=Array.from(document.querySelectorAll('[data-section-source]'));
        if(document.querySelector('.site-menu-toggle') && hosts.every(h=>h.classList.contains('is-loaded'))) resolve(true);
        else if(Date.now()>deadline) reject(new Error('page did not initialize'));
        else setTimeout(ready,50);
      } ready();
    })''')
    evaluate('document.fonts.ready.then(() => true)')
    for theme in ['light', 'dark']:
        evaluate(f"document.body.classList.toggle('dark-theme', {str(theme == 'dark').lower()})")
        for width, height in sizes:
            command('Emulation.setDeviceMetricsOverride', {'width': width, 'height': height,
                    'deviceScaleFactor': 1, 'mobile': False})
            evaluate(settle)
            errors = evaluate(audit)
            checks += 1
            if errors:
                failures.append({'page':page,'theme':theme,'size':[width,height],'errors':errors})
    print(page, 'checked at', len(sizes), 'sizes in both themes', flush=True)

command('Page.navigate', {'url': args.base + '/'})
evaluate('''new Promise(resolve => {function ready(){if(document.querySelector('#stills.is-loaded'))resolve();else setTimeout(ready,50);}ready();})''')
evaluate('document.fonts.ready.then(() => true)')
command('Emulation.setDeviceMetricsOverride', {'width':390,'height':844,'deviceScaleFactor':1,'mobile':True})
evaluate(settle)
menu_checks = evaluate('''(() => {
 const b=document.querySelector('.site-menu-toggle'),m=document.querySelector('#colorlib-main-menu');
 b.click();
 const opened=b.getAttribute('aria-expanded')==='true' && getComputedStyle(m).display!=='none';
 b.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 const escaped=b.getAttribute('aria-expanded')==='false';
 b.click();m.querySelector('a[href="#publications"]').click();
 return {opened,escaped,closedOnNavigate:b.getAttribute('aria-expanded')==='false'};
})()''')
evaluate(settle)
evaluate('''new Promise(resolve => {let previous=scrollY,stable=0;const started=Date.now();function check(){stable=Math.abs(scrollY-previous)<1?stable+1:0;previous=scrollY;if(stable>4||Date.now()-started>3000)resolve();else setTimeout(check,60);}check();})''')
menu_checks['anchorVisible'] = evaluate("document.querySelector('#publications').getBoundingClientRect().top >= document.querySelector('#colorlib-aside').getBoundingClientRect().bottom - 2")
geometry = evaluate("({y:scrollY,hash:location.hash,nav:document.querySelector('#colorlib-aside').getBoundingClientRect().bottom,section:document.querySelector('#publications').getBoundingClientRect().top,margin:getComputedStyle(document.querySelector('#publications')).scrollMarginTop})")
if not all(menu_checks.values()):
    failures.append({'menu':menu_checks})
print(json.dumps({'checks':checks, 'menu':menu_checks, 'geometry':geometry, 'failures':failures}, indent=2))
ws.close()
raise SystemExit(bool(failures))
