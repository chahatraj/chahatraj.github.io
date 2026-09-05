(function() {
  'use strict';

  var columnCount = function() {
    if (window.matchMedia('(max-width: 576px)').matches) return 1;
    if (window.matchMedia('(max-width: 992px)').matches) return 2;
    return 3;
  };

  window.initializeStillsGallery = function(root) {
    var gallery = root.querySelector('.gallery');
    if (!gallery || gallery.dataset.layoutInitialized === 'true') return;

    var tiles = Array.prototype.slice.call(gallery.querySelectorAll('.tile'));
    if (!tiles.length) return;

    gallery.dataset.layoutInitialized = 'true';
    tiles.forEach(function(tile, index) {
      tile.dataset.stillOrder = index;
    });

    var currentColumnCount = 0;
    var render = function() {
      var nextColumnCount = columnCount();
      if (nextColumnCount === currentColumnCount) return;
      currentColumnCount = nextColumnCount;

      tiles.sort(function(a, b) {
        return Number(a.dataset.stillOrder) - Number(b.dataset.stillOrder);
      });

      var columns = [];
      gallery.replaceChildren();
      for (var index = 0; index < nextColumnCount; index += 1) {
        var column = document.createElement('div');
        column.className = 'gallery-column';
        gallery.appendChild(column);
        columns.push(column);
      }

      tiles.forEach(function(tile, index) {
        columns[index % nextColumnCount].appendChild(tile);
      });
    };

    var resizeTimer = null;
    window.addEventListener('resize', function() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(render, 120);
    });

    render();
  };

  var initialize = function() {
    window.initializeStillsGallery(document);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
