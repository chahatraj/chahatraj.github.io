/* Decorative research trails occupy existing gutters, never the reading column. */
document.addEventListener('DOMContentLoaded', function () {
  var trails = document.querySelectorAll('.research-margin');
  var queued = false;
  function layout() {
    queued = false;
    var gutter = window.innerWidth / 2;
    document.querySelectorAll('.hero-wrap > .d-flex, .continuous-section .container').forEach(function (node) {
      var box = node.getBoundingClientRect();
      if (box.width && box.bottom > 90 && box.top < window.innerHeight) {
        gutter = Math.min(gutter, box.left, window.innerWidth - box.right);
      }
    });
    var width = Math.min(160, gutter - 28, (window.innerHeight - 160) / 3);
    trails.forEach(function (trail) {
      trail.hidden = window.innerWidth < 1200 || width < 75;
      trail.style.width = Math.max(0, width) + 'px';
      trail.style.setProperty('--gutter-offset', Math.max(10, (gutter - width) / 2) + 'px');
    });
  }
  function schedule() {
    if (!queued) { queued = true; requestAnimationFrame(layout); }
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(document.body);
  layout();
});
