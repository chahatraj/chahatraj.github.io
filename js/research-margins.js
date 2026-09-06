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
  // Interleave every round of artwork, then give every passage equal space.
  var additions = [
    [
      ['images/research-addition-translation.png', 'images/research-addition-speech.png'],
      ['images/research-addition-generation.png']
    ],
    [
      ['images/research-addition-story-roles.png', 'images/research-addition-agents.png', 'images/research-addition-cooperation.png']
    ]
  ];
  function element(tag, attributes) {
    var node = document.createElementNS(ns, tag);
    Object.keys(attributes).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }
  // Small marginal notes, not additional scene blocks: existing artwork and
  // connectors retain their exact coordinates. One outline motif per passage.
  var gapNotes = [
    // Language exchange.
    { paths:['M5 7Q17 4 29 7L28 23 20 23 14 29 14 23 5 23Z', 'M25 29Q35 27 46 30L46 44 39 44 34 49 34 44 25 44Z', 'M12 18l4-9 4 9m-6-3h4'], text:{value:'अ',x:30,y:40} },
    // A generated sentence being questioned and revised.
    { paths:['M10 4l26 1 7 8-1 34-32-1Z', 'M36 5l-1 9 8-1', 'M16 20l19 1m-19 7 16-1m-16 8 12 1', 'M23 25l9 5', 'M35 34q0-5 4-4t-1 7m0 4v.2'] },
    // Spoken language: different rhythms, same message.
    { paths:['M5 8q15-3 36 0l-1 19-10 1-7 6 1-6-19-1Z', 'M11 17h3l2-5 3 11 3-14 3 15 3-8 3 4h4', 'M13 42q4-5 8 0t8 0t8 0'] },
    // Two demographic portraits, equal footing and no filled silhouettes.
    { paths:['M9 15q-2-9 5-9t6 10q0 9-6 9t-5-10Z', 'M9 10q5 3 10-1', 'M4 39q-1-12 10-12t10 12', 'M31 15q-1-8 6-8t6 8q1 10-6 10t-6-10Z', 'M30 12q-2-10 7-10t9 12', 'M27 39q0-12 10-12t11 12', 'M8 46h13m12 0h13'] },
    // A story branching into alternative roles.
    { paths:['M4 9q10-4 20 2 10-5 22-1l-1 23q-11-3-21 2-10-5-20-2Z', 'M24 11v24', 'M9 16l10 1m-10 5 9 1m11-7 11-1m-11 7 10-1', 'M24 37v5m0 0-8 7m8-7 9 7'] },
    // Text and image viewed together.
    { paths:['M5 4l25 1-1 19-24-1Z', 'M10 10h14m-14 6h9', 'M22 29l25-1 1 20-26 1Z', 'M25 43l6-7 5 5 4-3 5 6', 'M40 32a2 2 0 1 0 0 4a2 2 0 1 0 0-4', 'M10 28q-2 12 8 12'] },
    // Balanced attention to two voices.
    { paths:['M7 7l14-1 1 11-6 1-4 4v-4H7Z', 'M31 6l14 1v11h-5v4l-4-4h-6Z', 'M26 22v24m-7 1h14', 'M9 28l34-1', 'M11 28l-6 11q7 5 14 0L13 28', 'M39 28l-6 11q7 5 14 0L41 28'] },
    // A small society of conversing agents.
    { paths:['M20 9a5 5 0 1 0 10 0a5 5 0 1 0-10 0', 'M16 23q0-8 9-8t9 8', 'M5 34a4 4 0 1 0 8 0a4 4 0 1 0-8 0', 'M2 46q0-7 7-7t7 7', 'M37 34a4 4 0 1 0 8 0a4 4 0 1 0-8 0', 'M34 46q0-7 7-7t7 7', 'M18 29l-3 3m18-3 3 3m-15 8h8'] },
    // Comparing language without adding a new crowded scene.
    { paths:['M5 7q7-2 17 0v14l-6 1-4 4v-4H5Z', 'M29 28q8-2 18 0v14h-5l-4 5v-5h-9Z', 'M29 13q10 1 10 9', 'M21 38q-10 0-10-8'], text:{value:'Aa',x:8,y:18}, secondText:{value:'अ',x:33,y:39} }
  ];
  function addGapNote(svg, width, from, to, side, index) {
    if (to - from < 130) return;
    var size = Math.min(54, width * .31);
    var onRight = (index + side) % 2 === 1;
    var x = onRight ? width - size - 5 : 5;
    var y = from + (to - from) * (onRight ? .57 : .43) - size / 2;
    var motif = gapNotes[(index + (side ? 5 : 0)) % gapNotes.length];
    var note = element('svg', {x:x, y:y, width:size, height:size, viewBox:'0 0 52 52', 'data-research-gap-note':'true',
      fill:'none', stroke:'currentColor', 'stroke-width':1.25, 'stroke-linecap':'round', 'stroke-linejoin':'round', opacity:side ? '.65' : '.3'});
    motif.paths.forEach(function (path) { note.appendChild(element('path', {d:path})); });
    [motif.text, motif.secondText].forEach(function (label) {
      if (!label) return;
      var text = element('text', {x:label.x, y:label.y, fill:'currentColor', stroke:'none', 'font-size':12, 'font-family':'Arial, sans-serif'});
      text.textContent = label.value;
      note.appendChild(text);
    });
    svg.appendChild(note);
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
      (additions[side][i] || []).forEach(function (source) {
        blocks.push({ source:source, height:width*2 });
      });
    }
    var artHeight = blocks.reduce(function (total, block) { return total + block.height; }, 0);
    var gap = Math.max(0, (height - artHeight) / (blocks.length - 1));
    var svg = element('svg', { viewBox: '0 0 '+width+' '+height, width:'100%', height:'100%', 'aria-hidden':'true' });
    var defs = element('defs', {});
    var ink = element('filter', {id:'translation-ink-'+side, 'color-interpolation-filters':'sRGB'});
    // Refined sources can have a light preview backing. Render only their dark
    // pen lines as alpha so it works on both backgrounds without a rectangle.
    ink.appendChild(element('feColorMatrix', {type:'matrix', values:'0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.27638 -.92976 -.09386 0 1'}));
    ink.appendChild(element('feComposite', {in2:'SourceAlpha', operator:'in'}));
    defs.appendChild(ink);
    var cooperationInk = ink.cloneNode(true);
    cooperationInk.setAttribute('id', 'cooperation-ink-'+side);
    cooperationInk.firstElementChild.setAttribute('values', '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.82914 -2.78928 -.28158 0 3');
    defs.appendChild(cooperationInk);
    svg.appendChild(defs);
    var y = 0;
    blocks.forEach(function (block, index) {
      if (block.source) {
        var extra = element('image', {href:block.source, x:0, y:y, width:width, height:block.height, preserveAspectRatio:'xMidYMid meet', 'data-research-addition':'true'});
        if (/translation/.test(block.source)) extra.setAttribute('filter','url(#translation-ink-'+side+')');
        if (/cooperation/.test(block.source)) extra.setAttribute('filter','url(#cooperation-ink-'+side+')');
        extra.setAttribute('opacity',side ? '.85' : '.6');
        if (/speech/.test(block.source)) extra.setAttribute('opacity', '.4');
        if (/story-roles/.test(block.source)) extra.setAttribute('opacity', '.65');
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
          addGapNote(svg, width, from, to, side, index);
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
