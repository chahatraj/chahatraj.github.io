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
  // Interleave both rounds of artwork, then give every passage equal space.
  var additions = [
    ['images/research-addition-translation.png', 'images/research-addition-generation.png'],
    ['images/research-addition-agents.png']
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
    var count = story.breaks.length - 1;
    var blocks = [];
    for (var i = 0; i < count; i++) {
      var cropHeight = story.breaks[i+1] - story.breaks[i];
      blocks.push({ top:story.breaks[i], cropHeight:cropHeight, height:cropHeight*scale });
      if (additions[side][i]) blocks.push({ source:additions[side][i], height:width*2 });
    }
    var artHeight = blocks.reduce(function (total, block) { return total + block.height; }, 0);
    var gap = Math.max(0, (height - artHeight) / (blocks.length - 1));
    var svg = element('svg', { viewBox: '0 0 '+width+' '+height, width:'100%', height:'100%', 'aria-hidden':'true' });
    var defs = element('defs', {});
    var ink = element('filter', {id:'translation-ink-'+side, 'color-interpolation-filters':'sRGB'});
    // The translation source has a light preview backing. Render only its dark
    // pen lines as alpha so it works on both backgrounds without a rectangle.
    ink.appendChild(element('feColorMatrix', {type:'matrix', values:'0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.27638 -.92976 -.09386 0 1'}));
    ink.appendChild(element('feComposite', {in2:'SourceAlpha', operator:'in'}));
    defs.appendChild(ink);
    svg.appendChild(defs);
    var y = 0;
    blocks.forEach(function (block, index) {
      if (block.source) {
        var extra = element('image', {href:block.source, x:0, y:y, width:width, height:block.height, preserveAspectRatio:'xMidYMid meet', 'data-research-addition':'true'});
        if (block.source.indexOf('translation') !== -1) extra.setAttribute('filter','url(#translation-ink-'+side+')');
        extra.setAttribute('opacity',side ? '.85' : '.6');
        svg.appendChild(extra);
      } else {
        var slice = element('svg', {x:0, y:y, width:width, height:block.height, viewBox:'0 '+block.top+' '+story.width+' '+block.cropHeight, overflow:'hidden'});
        slice.appendChild(element('image', {href:story.src, width:story.width, height:story.height}));
        svg.appendChild(slice);
      }
      y += block.height;
      if (index < blocks.length - 1) {
        var x = width * (side ? .6 : .48);
        var from = y + 8;
        var to = y + gap - 8;
        if (to > from) {
          svg.appendChild(element('path', {
            d:'M'+x+' '+from+' C'+(width*.1)+' '+(from+(to-from)*.3)+' '+(width*.92)+' '+(from+(to-from)*.65)+' '+(width*.52)+' '+to,
            fill:'none', stroke:'currentColor', opacity:'.35', 'stroke-width':1.1, 'stroke-dasharray':'2 8', 'stroke-linecap':'round'
          }));
        }
        y += gap;
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
