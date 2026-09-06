/* Human narrative marginalia; preserve character proportions while extending
   the quiet connecting passages through the document, ending before Stills. */
document.addEventListener('DOMContentLoaded', function () {
  var trails = document.querySelectorAll('.research-margin');
  var ns = 'http://www.w3.org/2000/svg';
  var queued = false;
  var stories = [
    { src: 'images/research-story-languages.png', width: 733, height: 2146, breaks: [0, 750, 1510, 2146] },
    { src: 'images/research-story-perspectives.png', width: 724, height: 2172, breaks: [0, 1560, 2172] }
  ];
  function element(tag, attributes) {
    var node = document.createElementNS(ns, tag);
    Object.keys(attributes).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }
  function build(trail, height, width, side) {
    var signature = Math.round(height) + ':' + Math.round(width);
    if (trail.dataset.shape === signature) return;
    trail.dataset.shape = signature;
    trail.replaceChildren();
    var story = stories[side];
    var scale = width / story.width;
    var artHeight = story.height * scale;
    var count = story.breaks.length - 1;
    var gap = Math.max(20, (height - artHeight) / (count - 1));
    var svg = element('svg', { viewBox: '0 0 '+width+' '+height, width:'100%', height:'100%', 'aria-hidden':'true' });
    var y = 0;
    for (var i = 0; i < count; i++) {
      var cropHeight = story.breaks[i+1] - story.breaks[i];
      var visibleHeight = cropHeight * scale;
      var slice = element('svg', {x:0, y:y, width:width, height:visibleHeight, viewBox:'0 '+story.breaks[i]+' '+story.width+' '+cropHeight, overflow:'hidden'});
      slice.appendChild(element('image', {href:story.src, width:story.width, height:story.height}));
      svg.appendChild(slice);
      y += visibleHeight;
      if (i < count - 1) {
        var x = width * (side ? .6 : .48);
        svg.appendChild(element('path', {
          d:'M'+x+' '+y+' C'+(width*.1)+' '+(y+gap*.3)+' '+(width*.92)+' '+(y+gap*.65)+' '+(width*.52)+' '+(y+gap),
          fill:'none', stroke:'currentColor', opacity:'.35', 'stroke-width':1.1, 'stroke-dasharray':'2 8', 'stroke-linecap':'round'
        }));
        y += gap;
      }
    }
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
    var width = Math.min(180, gutter - 24);
    trails.forEach(function (trail, side) {
      var start = a.top + window.scrollY + a.height * (side ? .9 : .58);
      var height = Math.max(0, stop - start);
      trail.hidden = window.innerWidth < 1200 || width < 95 || height < 900;
      if (trail.hidden) return;
      trail.style.top = start+'px';
      trail.style.height = height+'px';
      trail.style.width = width+'px';
      /* Hug the reading margin with a 12px safety gap, not the viewport edge. */
      trail.style.setProperty('--gutter-offset', Math.max(12, gutter-width-12)+'px');
      build(trail, height, width, side);
    });
  }
  function schedule() { if (!queued) { queued=true; requestAnimationFrame(layout); } }
  window.addEventListener('resize',schedule);
  new ResizeObserver(schedule).observe(document.getElementById('colorlib-page'));
  document.fonts.ready.then(schedule);
  layout();
});
