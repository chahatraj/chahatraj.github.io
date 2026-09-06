/* Faint outline trails scroll in document space and stop before Stills. */
document.addEventListener('DOMContentLoaded', function () {
  var trails = document.querySelectorAll('.research-margin');
  var ns = 'http://www.w3.org/2000/svg';
  var queued = false;
  var drawings = {
    voice: 'M8 8q-4 0-4 5v19q0 5 5 5h8l-3 10 14-10h18q5 0 5-5V13q0-5-5-5Z M18 27l6-12 6 12m-10-4h8',
    person: 'M14 24c-5-19 29-23 30-3l-1 13q-2 12-13 12T16 35Zm1-3q10 1 14-9 5 9 15 10M23 29v2m13-2v2m-12 7q6 4 11-1M21 45v8L8 59q-7 5-6 17m35-31v8l13 6q7 4 7 17',
    globe: 'M5 30a25 25 0 1 0 50 0 25 25 0 1 0-50 0M30 5c-18 12-18 38 0 50m0-50c18 12 18 38 0 50M7 21q23 9 46 0M7 39q23-8 46 0',
    book: 'M4 10q13-4 26 4 13-8 26-4v37q-13-4-26 4-13-8-26-4Zm26 4v37M10 20l12 3m-12 7 12 3m16-10 11-3m-11 13 11-3',
    image: 'M5 6l48 2-2 45-48-2ZM10 42l13-16 11 10 8-8 6 13M37 17a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
    lens: 'M8 20a13 13 0 1 0 26 0 13 13 0 1 0-26 0m23 10 17 18m-15-20 17 18',
    thought: 'M14 29C-2 22 6 3 19 7 26-5 43 2 43 11c18 0 20 22 3 25H22m-9 4a4 4 0 1 0 0 8 4 4 0 1 0 0-8m-8 14 1 1',
    dice: 'M8 8l38 3-3 38-38-4Zm9 10h1m17 3h1m-11 9h1m-12 7h1m18 3h1',
    bulb: 'M19 36C0 19 15 1 29 7c16 5 18 18 5 30v9H19Zm1 15 13 1M25 36l-4-15 6 4 6-3-4 15',
    bridge: 'M2 39q28-39 57 0M3 47q27-36 55 0M8 33v10m11-19v10m12-13v10m12-8v11m10-4v11',
    hands: 'M3 23l12-10 10 3 7-4 23 14-13 18-11-2-17-10Zm12-10 10 3-6 8q5 5 10-1l4-3 13 12M3 18l-3 12 11 8m44-18 5 9-9 11',
    leaf: 'M7 38C1 15 17 5 43 4c-1 22-10 36-31 31M7 42 34 12m-15 17-1-11m6 6 12-1'
  };
  var themes = [['voice','person','globe','voice','book','person','hands','leaf'], ['image','lens','person','thought','dice','bulb','bridge','hands']];
  function build(trail, height, side) {
    var signature = Math.round(height) + ':' + side;
    if (trail.dataset.shape === signature) return;
    trail.dataset.shape = signature;
    trail.replaceChildren();
    var svg = document.createElementNS(ns, 'svg');
    Object.entries({viewBox:'0 0 130 '+height, width:'100%', height:'100%', fill:'none', stroke:'currentColor', 'stroke-width':'1.25', 'stroke-linecap':'round', 'stroke-linejoin':'round'}).forEach(function(pair) { svg.setAttribute(pair[0], pair[1]); });
    themes[side].forEach(function (kind, i) {
      var y = 35 + i * (height - 160) / 7;
      var x = (i + side) % 2 ? 56 : 14;
      var motif = document.createElementNS(ns, 'path');
      motif.setAttribute('d', drawings[kind]);
      motif.setAttribute('transform', 'translate('+x+' '+y+') scale(.85)');
      svg.appendChild(motif);
      if (i < 7) {
        var start = y + 80;
        var end = 19 + (i+1) * (height-160) / 7;
        var curve = document.createElementNS(ns, 'path');
        curve.setAttribute('d', 'M'+(x+26)+' '+start+' C'+(side?8:122)+' '+(start+(end-start)*.35)+' '+(side?122:8)+' '+(end-(end-start)*.3)+' '+((i+side)%2?40:82)+' '+end);
        curve.setAttribute('stroke-dasharray','2 9');
        curve.setAttribute('opacity','.65');
        svg.appendChild(curve);
      }
    });
    trail.appendChild(svg);
  }
  function layout() {
    queued = false;
    var about = document.querySelector('.hero-wrap');
    var stills = document.getElementById('stills');
    if (!about || !stills) return;
    var a = about.getBoundingClientRect();
    var stop = stills.getBoundingClientRect().top + window.scrollY - 70;
    var gutter = window.innerWidth / 2;
    document.querySelectorAll('.hero-wrap > .d-flex, .continuous-section:not(#stills) .container').forEach(function (node) {
      var box = node.getBoundingClientRect();
      if (box.width) gutter = Math.min(gutter, box.left, window.innerWidth-box.right);
    });
    var width = Math.min(130, gutter-28);
    trails.forEach(function (trail, side) {
      var start = a.top + window.scrollY + a.height * (side ? .9 : .58);
      var height = Math.max(0, stop-start);
      trail.hidden = window.innerWidth < 1200 || width < 65 || height < 700;
      if (trail.hidden) return;
      trail.style.top = start+'px';
      trail.style.height = height+'px';
      trail.style.width = width+'px';
      trail.style.setProperty('--gutter-offset',Math.max(10,(gutter-width)/2)+'px');
      build(trail,height*130/width,side);
    });
  }
  function schedule() { if (!queued) { queued=true; requestAnimationFrame(layout); } }
  window.addEventListener('resize',schedule);
  new ResizeObserver(schedule).observe(document.getElementById('colorlib-page'));
  document.fonts.ready.then(schedule);
  layout();
});
