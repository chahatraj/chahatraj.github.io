(function() {
  'use strict';

  var sectionHosts = Array.prototype.slice.call(document.querySelectorAll('[data-section-source]'));
  if (!sectionHosts.length) return;

  var scopeSelector = function(selector, scope) {
    var scopedSelector = selector.trim().replace(/#colorlib-main/g, '.continuous-section-main');

    if (scopedSelector.indexOf('body.dark-theme') === 0) {
      return 'body.dark-theme ' + scope + scopedSelector.slice('body.dark-theme'.length);
    }
    if (scopedSelector.indexOf('body') === 0) {
      return scope + scopedSelector.slice(4);
    }
    if (scopedSelector.indexOf('html') === 0) {
      return scope + scopedSelector.slice(4);
    }

    return scope + ' ' + scopedSelector;
  };

  var serializeScopedRules = function(rules, scope) {
    return Array.prototype.map.call(rules, function(rule) {
      if (rule.type === CSSRule.STYLE_RULE) {
        var selectors = rule.selectorText.split(',').filter(function(selector) {
          return selector.trim().indexOf(':root') === -1;
        }).map(function(selector) {
          return scopeSelector(selector, scope);
        });

        if (!selectors.length) {
          return '';
        }

        return selectors.join(', ') + ' {' + rule.style.cssText + '}';
      }

      if (rule.cssRules && rule.type === CSSRule.MEDIA_RULE) {
        return '@media ' + rule.conditionText + ' {' + serializeScopedRules(rule.cssRules, scope) + '}';
      }

      if (rule.cssRules && rule.type === CSSRule.SUPPORTS_RULE) {
        return '@supports ' + rule.conditionText + ' {' + serializeScopedRules(rule.cssRules, scope) + '}';
      }

      return rule.cssText;
    }).join('\n');
  };

  var addScopedStyles = function(host, sourceDocument) {
    var scope = '#' + host.id;
    var combinedCss = '';

    sourceDocument.querySelectorAll('head style').forEach(function(sourceStyle) {
      var parserStyle = document.createElement('style');
      parserStyle.textContent = sourceStyle.textContent;
      document.head.appendChild(parserStyle);
      combinedCss += serializeScopedRules(parserStyle.sheet.cssRules, scope) + '\n';
      parserStyle.remove();
    });

    var scopedStyle = document.createElement('style');
    scopedStyle.dataset.continuousSectionStyle = host.id;
    scopedStyle.textContent = combinedCss;
    document.head.appendChild(scopedStyle);
  };

  var initializeLazyImages = function(root) {
    var lazyImages = Array.prototype.slice.call(root.querySelectorAll('img[data-src]'));
    if (!lazyImages.length) return;

    var loadImage = function(image) {
      if (!image.dataset.src) return;
      image.src = image.dataset.src;
      image.removeAttribute('data-src');
      image.classList.remove('lazy-still');
    };

    if (!('IntersectionObserver' in window)) {
      lazyImages.forEach(loadImage);
      return;
    }

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        loadImage(entry.target);
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: '160px 0px',
      threshold: 0.01
    });

    lazyImages.forEach(function(image) {
      observer.observe(image);
    });
  };

  var initializePublications = function(root) {
    root.querySelectorAll('.publication-paper > p').forEach(function(publicationMeta) {
      if (publicationMeta.querySelector('.publication-actions')) return;

      var firstButton = publicationMeta.querySelector('.btn.badge');
      if (!firstButton) return;

      var actions = document.createElement('span');
      actions.className = 'publication-actions';

      var firstAction = firstButton.parentElement && firstButton.parentElement.tagName === 'A' && firstButton.parentElement.parentElement === publicationMeta
        ? firstButton.parentElement
        : firstButton;
      var node = firstAction;
      while (node) {
        var next = node.nextSibling;
        if (node.nodeType === Node.ELEMENT_NODE) {
          var button = node.matches && node.matches('.btn.badge') ? node : node.querySelector && node.querySelector('.btn.badge');
          if (button) {
            var buttonColor = button.style.backgroundColor;
            if (buttonColor) {
              button.style.setProperty('--action-color', buttonColor);
              var channels = buttonColor.match(/\d+/g);
              if (channels && channels.length >= 3) {
                button.style.setProperty(
                  '--action-text-color',
                  'rgb(' +
                    Math.round(Number(channels[0]) * 0.52) + ', ' +
                    Math.round(Number(channels[1]) * 0.52) + ', ' +
                    Math.round(Number(channels[2]) * 0.52) +
                  ')'
                );
              }
            }
          }
        }
        actions.appendChild(node);
        node = next;
      }

      publicationMeta.appendChild(actions);
    });

    root.querySelectorAll('[data-popup]').forEach(function(badge) {
      var popup = root.querySelector('#' + badge.dataset.popup);
      if (!popup) return;
      badge.addEventListener('click', function() {
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
      });
    });

    var searchInput = root.querySelector('#publication-search');
    var papers = Array.prototype.slice.call(root.querySelectorAll('.publication-paper'));
    var years = Array.prototype.slice.call(root.querySelectorAll('.publication-year'));
    var count = root.querySelector('.publication-search-count');
    var empty = root.querySelector('.publication-empty');

    if (!searchInput || !papers.length) return;

    papers.forEach(function(paper) {
      var summary = paper.querySelector('p');
      var venue = paper.querySelector('.publication-venue');
      paper.dataset.searchText = [
        summary ? summary.textContent : '',
        venue ? venue.textContent : ''
      ].join(' ').toLowerCase();
    });

    var updateSearch = function() {
      var query = searchInput.value.trim().toLowerCase();
      var visibleCount = 0;

      papers.forEach(function(paper) {
        var isVisible = !query || paper.dataset.searchText.indexOf(query) !== -1;
        paper.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount += 1;
      });

      years.forEach(function(year) {
        var hasVisiblePaper = false;
        var next = year.nextElementSibling;
        while (next && !next.classList.contains('publication-year')) {
          if (next.classList.contains('publication-paper') && next.style.display !== 'none') {
            hasVisiblePaper = true;
            break;
          }
          next = next.nextElementSibling;
        }
        year.style.display = hasVisiblePaper ? '' : 'none';
      });

      if (count) count.textContent = visibleCount + ' of ' + papers.length;
      if (empty) empty.style.display = visibleCount ? 'none' : 'block';
    };

    searchInput.addEventListener('input', updateSearch);
    updateSearch();
  };

  var loadSection = function(host) {
    var source = host.dataset.sectionSource;
    var title = host.dataset.sectionTitle;

    return fetch(source, { cache: 'no-cache' })
      .then(function(response) {
        if (!response.ok) throw new Error('Unable to load ' + source);
        return response.text();
      })
      .then(function(html) {
        var sourceDocument = new DOMParser().parseFromString(html, 'text/html');
        var main = sourceDocument.querySelector('#colorlib-main');
        if (!main) throw new Error('Missing page content in ' + source);

        main.querySelectorAll('script, #ftco-loader, .site-footer-note').forEach(function(element) {
          element.remove();
        });

        addScopedStyles(host, sourceDocument);
        main.removeAttribute('id');
        main.classList.add('continuous-section-main');
        host.innerHTML = '';
        host.appendChild(main);
        initializeLazyImages(host);
        if (source === 'publications.html') initializePublications(host);
        host.classList.add('is-loaded');
      })
      .catch(function() {
        host.innerHTML = '';
        var fallback = document.createElement('div');
        fallback.className = 'continuous-section-error';
        fallback.innerHTML = '<h2>' + title + '</h2><p>This section could not load. <a href="' + source + '">Open the standalone page</a>.</p>';
        host.appendChild(fallback);
      });
  };

  var updateActiveNavigation = function() {
    var sections = [document.getElementById('about')].concat(sectionHosts);
    var navHeight = document.getElementById('colorlib-aside').offsetHeight;
    var activeId = 'about';

    sections.forEach(function(section) {
      if (section && section.getBoundingClientRect().top <= navHeight + 80) {
        activeId = section.id;
      }
    });

    document.querySelectorAll('#colorlib-main-menu li').forEach(function(item) {
      var link = item.querySelector('a[href^="#"]');
      item.classList.toggle('colorlib-active', Boolean(link && link.getAttribute('href') === '#' + activeId));
    });
  };

  var scrollToCurrentHash = function() {
    if (!window.location.hash) return;

    var target = document.getElementById(window.location.hash.slice(1));
    var navigation = document.getElementById('colorlib-aside');
    if (!target || !navigation) return;

    var root = document.documentElement;
    var previousScrollBehavior = root.style.scrollBehavior;
    var targetTop = target.getBoundingClientRect().top + window.pageYOffset - navigation.offsetHeight;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, Math.max(0, targetTop));
    root.style.scrollBehavior = previousScrollBehavior;
  };

  var updateQueued = false;
  var queueNavigationUpdate = function() {
    if (updateQueued) return;
    updateQueued = true;
    window.requestAnimationFrame(function() {
      updateQueued = false;
      updateActiveNavigation();
    });
  };

  Promise.all(sectionHosts.map(loadSection)).then(function() {
    window.setTimeout(function() {
      scrollToCurrentHash();
      updateActiveNavigation();
    }, 200);
    window.setTimeout(function() {
      scrollToCurrentHash();
      updateActiveNavigation();
    }, 1800);
  });

  window.addEventListener('scroll', queueNavigationUpdate, { passive: true });
  window.addEventListener('resize', queueNavigationUpdate);
  window.addEventListener('hashchange', queueNavigationUpdate);

  if (window.location.hash && 'ResizeObserver' in window) {
    var anchorCorrectionTimer = null;
    var anchorCorrectionObserver = new ResizeObserver(function() {
      window.clearTimeout(anchorCorrectionTimer);
      anchorCorrectionTimer = window.setTimeout(function() {
        scrollToCurrentHash();
        updateActiveNavigation();
      }, 120);
    });

    [document.getElementById('about')].concat(sectionHosts).forEach(function(section) {
      if (section) anchorCorrectionObserver.observe(section);
    });

    window.setTimeout(function() {
      anchorCorrectionObserver.disconnect();
    }, 8000);
  }

  updateActiveNavigation();
})();
