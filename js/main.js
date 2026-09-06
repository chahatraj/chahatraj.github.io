window.initializeDoodles = function(root) {
  root.querySelectorAll('.publication-paper').forEach(function(paper) {
    if (paper.dataset.layoutReady) return;
    paper.dataset.layoutReady = 'true';
    var meta = paper.querySelector(':scope > p');
    if (!meta) return;
    var actions = meta.querySelector('.publication-actions');
    if (!actions) {
      actions = document.createElement('span');
      actions.className = 'publication-actions';
      meta.querySelectorAll('.btn.badge').forEach(function(button) {
        actions.appendChild(button.parentElement.tagName === 'A' ? button.parentElement : button);
      });
      meta.appendChild(actions);
    }
    actions.querySelectorAll('.btn.badge').forEach(function(button) {
      if (/^(Poster|Slides)$/i.test(button.textContent.trim())) {
        (button.parentElement.tagName === 'A' ? button.parentElement : button).hidden = true;
      }
    });
    var venueText = '';
    Array.from(meta.childNodes).forEach(function(node) {
      if (node.nodeType !== Node.TEXT_NODE) return;
      var match = node.textContent.match(/\[([^\]]+)\]/);
      if (match) {
        venueText = match[1];
        node.textContent = node.textContent.replace(match[0], '');
      }
    });
    var venue = paper.querySelector('.publication-venue');
    var line = document.createElement('span');
    line.className = 'publication-context publication-sidebar';
    var venueLabel = document.createElement('span');
    venueLabel.className = 'publication-venue';
    venueLabel.textContent = venueText || (venue ? venue.textContent : '');
    line.appendChild(venueLabel);
    var award = paper.querySelector('.publication-award');
    if (award) {
      var recognition = document.createElement('span');
      recognition.className = 'publication-context';
      recognition.appendChild(award);
      var selectivity = venueLabel.textContent.match(/\s*\(top 15% of accepted papers\)/i);
      if (selectivity) {
        venueLabel.textContent = venueLabel.textContent.replace(selectivity[0], '');
        var note = document.createElement('span');
        note.className = 'publication-selectivity';
        note.textContent = '· Top 15% of accepted papers';
        recognition.appendChild(note);
      }
      meta.insertBefore(recognition, actions);
    }
    line.appendChild(actions);
    paper.appendChild(line);
    var visual = paper.querySelector('.publication-visual');
    if (visual) visual.hidden = true;
  });
  var drawings = {
    quill: 'M7 25C9 14 16 5 27 4c1 11-6 19-16 18M7 25l14-14m-8 8 1-6m3 2 6-1M4 28q5-2 10 0m14-5v4m-2-2h4',
    news: 'm5 6 23 1-1 21-22-1Zm5 5h12m-12 5h5m3 0h5m-13 5h5m3 0h5',
    paper: 'm8 3 13 1 6 6-1 19-19-1Zm13 1v7h6M12 16h10m-10 5h8',
    service: 'M6 17q3-5 7-1l3 2 5-5 6 5-9 9-12-8M4 13l-2 7 5 3m21-10 2 7-4 3M12 8q4-6 7 0',
    poster: 'M5 4h23v20H5Zm11 20-4 6m5-6 5 6M10 9h13m-13 5 4-2 5 6 4-3',
    slides: 'M4 5h25M6 5v18h21V5M16 23v6m-5 0h10M11 17l4-4 4 2 4-6',
    code: 'm11 9-7 7 7 6m11-13 7 7-7 6M19 5l-5 23',
    medal: 'm8 3 4 10m12-10-4 10M8 3h6l3 7 3-7h4M23 20c0 10-16 10-16 0s16-10 16 0Zm-8-5 1 3 3 1-2 2v3l-3-2-3 1 1-3-2-2 3-1Z',
    market: 'm8 13 22-9-8 22-5-9-9-4Zm9 4L30 4M8 21c-8 0-6 10 0 8 4-2 0-5-2-2m6-3 1-2',
    camera: 'm4 10 7-.5 2-4 9 .5 2 4 7 1 .5 16L4 28ZM22 17c3 6-5 10-8 5-4-6 5-11 8-5ZM7 14h3m16 0h2M5 6 3 4'
  };
  function icon(kind) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 34 34');
    svg.setAttribute('class', 'personal-doodle');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = '<path d="' + drawings[kind] + '" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>';
    return svg;
  }
  root.querySelectorAll('.home-personal-note').forEach(function(el) {
    var old = el.querySelector('.personal-doodle');
    if (old) old.remove();
    el.appendChild(icon('quill'));
  });
  root.querySelectorAll('.desc h1.mb-4').forEach(function(el) {
    if (el.querySelector('.personal-doodle')) return;
    var title = el.textContent.toLowerCase();
    var kind = /news/.test(title) ? 'news' : /publication/.test(title) ? 'paper' : /service/.test(title) ? 'service' : /poster/.test(title) ? 'poster' : /slide/.test(title) ? 'slides' : null;
    if (kind) el.appendChild(icon(kind));
  });
  root.querySelectorAll('.job-market-box').forEach(function(el) {
    var line = el;
    if (!line.querySelector('.personal-doodle')) line.prepend(icon('market'));
  });
  root.querySelectorAll('.news-award-icon, .publication-award-icon').forEach(function(el) {
    el.classList.add('doodle-award');
    if (!el.querySelector('svg')) el.appendChild(icon('medal'));
  });
  root.querySelectorAll('.publication-paper .btn.badge').forEach(function(el) {
    if (el.querySelector('svg')) return;
    var label = el.textContent.trim().toLowerCase();
    var kind = {pdf: 'paper', paper: 'paper', code: 'code', poster: 'poster', slides: 'slides'}[label];
    if (!kind) return;
    if (label === 'pdf') el.textContent = 'Paper';
    el.appendChild(icon(kind));
  });
};
document.addEventListener('DOMContentLoaded', function() { window.initializeDoodles(document); });

// Use the page's daily accent for the outlined Devanagari favicon.
document.addEventListener('DOMContentLoaded', function() {
  var link = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
  if (!link) return;
  var color = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
  if (!color) return;
  fetch(link.href)
    .then(function(response) {
      if (!response.ok) throw new Error('Favicon unavailable');
      return response.text();
    })
    .then(function(source) {
      var svg = new DOMParser().parseFromString(source, 'image/svg+xml');
      if (svg.querySelector('parsererror')) return;
      svg.querySelectorAll('path').forEach(function(path) { path.setAttribute('fill', color); });
      link.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg.documentElement));
    })
    .catch(function() { /* Keep the static favicon if loading fails. */ });
});

 AOS.init({
 	duration: 800,
 	easing: 'slide'
 });

(function($) {

	"use strict";

	$(window).stellar({
    responsive: true,
    parallaxBackgrounds: true,
    parallaxElements: true,
    horizontalScrolling: false,
    hideDistantElements: false,
    scrollProperty: 'scroll'
  });


	var fullHeight = function() {

		$('.js-fullheight').css('height', $(window).height());
		$(window).resize(function(){
			$('.js-fullheight').css('height', $(window).height());
		});

	};
	fullHeight();

	var unlinkContactNav = function() {
		$('#colorlib-main-menu a[href$="contact.html"]').closest('li').remove();
	};
	unlinkContactNav();

	var openProfileLinksInNewTabs = function() {
		$('a[aria-label="LinkedIn"], a[aria-label="Twitter"], a[aria-label="GitHub"], a[aria-label="Google Scholar"], a[aria-label="CV"]').attr({
			'target': '_blank',
			'rel': 'noopener noreferrer'
		});
	};
	openProfileLinksInNewTabs();

	var configureContinuousNavigation = function() {
		var pageName = window.location.pathname.split('/').pop();
		var isHomepage = !pageName || pageName === 'index.html';
		var sectionRoutes = {
			'index.html': 'about',
			'news.html': 'news',
			'publications.html': 'publications',
			'slides.html': 'slides',
			'stills.html': 'stills'
		};

		$('#colorlib-main-menu a').each(function() {
			var $link = $(this);
			var directSection = $link.attr('data-home-section');
			if (directSection) {
				$link.attr('href', (isHomepage ? '' : 'index.html') + '#' + directSection);
				return;
			}
			var href = ($link.attr('href') || '').split(/[?#]/)[0].replace(/^\.\//, '');
			var sectionId = sectionRoutes[href];
			if (!sectionId) return;

			$link.attr('href', (isHomepage ? '' : 'index.html') + '#' + sectionId);
		});
	};
	configureContinuousNavigation();

	var themeToggle = function() {
		var storageKey = 'site-theme';
		var $aside = $('#colorlib-aside');

		if (!$aside.length || $('.theme-toggle').length) return;

		var storedTheme = null;
		try {
			storedTheme = localStorage.getItem(storageKey);
		} catch (error) {
			storedTheme = null;
		}
		var isDark = storedTheme === 'dark';
		var $toggle = $(
			'<div class="theme-toggle-wrap">' +
				'<button class="theme-toggle" type="button" aria-label="Switch to light theme" aria-pressed="true">' +
					'<span class="theme-toggle-icon" aria-hidden="true">☀</span>' +
					'<span class="theme-toggle-text">Light</span>' +
				'</button>' +
			'</div>'
		);
		var $button = $toggle.find('.theme-toggle');
		var $icon = $toggle.find('.theme-toggle-icon');
		var $text = $toggle.find('.theme-toggle-text');
		var transitionResetFrame = null;

		var applyTheme = function(dark) {
			document.documentElement.classList.add('theme-switching');
			if (transitionResetFrame !== null) {
				window.cancelAnimationFrame(transitionResetFrame);
			}
			$('body').toggleClass('dark-theme', dark);
			$button.attr({
				'aria-pressed': dark ? 'true' : 'false',
				'aria-label': dark ? 'Switch to light theme' : 'Switch to dark theme'
			});
			$icon.html(dark
				? '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M22.6 13c2 6-2.2 11-7.4 10.5-5.5-.4-8.2-5.1-6.2-10.1 2-5 10.9-6.2 13.6-.4Z"/><path d="m15 3 .5 3M25 6l-2 2M29 15l-3 .4M25 26l-2-2M15 29l.3-3M5 25l2.3-2M2 15l3 .4M6 5l2 2.5M12 14v1m7-1v1m-6.5 3q3 3 5.5-.2"/></svg>'
				: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M19 4C9 2 3 11 6 20c3 8 14 9 20 2-9 1-16-9-7-18Z"/><path d="M9 16q2 2 4-.5m-1 6q2 1 3-.8M24 4l.5 2.8L27 8l-2.7.6L23 11l-.3-2.7L20 7l2.8-.5Z"/></svg>');
			$text.text(dark ? 'Light' : 'Dark');
			transitionResetFrame = window.requestAnimationFrame(function() {
				transitionResetFrame = window.requestAnimationFrame(function() {
					document.documentElement.classList.remove('theme-switching');
					transitionResetFrame = null;
				});
			});
		};

		var $logo = $aside.find('#colorlib-logo');
		if ($logo.length) {
			$logo.after($toggle);
		} else {
			$aside.prepend($toggle);
		}
		applyTheme(isDark);

		$button.on('click', function() {
			isDark = !$('body').hasClass('dark-theme');
			try {
				localStorage.setItem(storageKey, isDark ? 'dark' : 'light');
			} catch (error) {}
			applyTheme(isDark);
		});
	};
	themeToggle();

	var backToTop = function() {
		var pageName = window.location.pathname.split('/').pop();
		if (pageName && pageName !== 'index.html' && pageName !== 'news.html' && pageName !== 'publications.html') return;
		if ($('.back-to-top').length) return;
		var $button = $('<button class="back-to-top" type="button" aria-label="Back to top" tabindex="-1"><span class="back-to-top-label" aria-hidden="true">Back to top</span><svg class="back-to-top-doodle" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M11 38c11 2 19-6 19-16 0-5-1-10 0-15"/><path d="M21 16c3-3 6-6 9-9 2 3 5 6 9 9"/><path d="m7 31-2-3m2 14-3 1" opacity=".55"/></svg></button>');
		$('body').append($button);

		var updateButton = function() {
			var visible = $(window).scrollTop() > 180;
			$button.toggleClass('is-visible', visible).attr('tabindex', visible ? '0' : '-1');
		};

		$button.on('click', function() {
			var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' });
		});
		$(window).on('scroll resize', updateButton);
		updateButton();
	};
	backToTop();

	var siteFooter = function() {
		var $main = $('#colorlib-main');
		if (!$main.length || $('.site-footer-note').length) return;
		var pageName = window.location.pathname.split('/').pop();
		var isHomepage = !pageName || pageName === 'index.html';
		var fallbackDate = 'May 2, 2026';
		var lastModified = new Date(document.lastModified);
		var updatedDate = isNaN(lastModified.getTime()) ? fallbackDate : lastModified.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

		$main.append(
			'<footer class="site-footer-note' + (isHomepage ? ' site-footer-note--homepage' : '') + '">' +
				'<span>Last updated on <span class="site-footer-date">' + updatedDate + '</span></span>' +
				'<span class="site-footer-separator">·</span>' +
				'<span>Made with <span class="site-footer-heart" aria-label="heart"></span></span>' +
			'</footer>'
		);
	};
	$(siteFooter);

	// loader
	var loader = function() {
		setTimeout(function() { 
			if($('#ftco-loader').length > 0) {
				$('#ftco-loader').removeClass('show');
			}
		}, 1);
	};
	loader();

	// Scrollax
   $.Scrollax();


   var burgerMenu = function() {

		$('.js-colorlib-nav-toggle').on('click', function(event){
			event.preventDefault();
			var $this = $(this);

			if ($('body').hasClass('offcanvas')) {
				$this.removeClass('active');
				$('body').removeClass('offcanvas');	
			} else {
				$this.addClass('active');
				$('body').addClass('offcanvas');	
			}
		});
	};
	burgerMenu();

	// Click outside of offcanvass
	var mobileMenuOutsideClick = function() {

		$(document).click(function (e) {
	    var container = $("#colorlib-aside, .js-colorlib-nav-toggle");
	    if (!container.is(e.target) && container.has(e.target).length === 0) {

	    	if ( $('body').hasClass('offcanvas') ) {

    			$('body').removeClass('offcanvas');
    			$('.js-colorlib-nav-toggle').removeClass('active');
			
	    	}
	    	
	    }
		});

		$(window).scroll(function(){
			if ( $('body').hasClass('offcanvas') ) {

    			$('body').removeClass('offcanvas');
    			$('.js-colorlib-nav-toggle').removeClass('active');
			
	    	}
		});

	};
	mobileMenuOutsideClick();

	var carousel = function() {
		$('.home-slider').owlCarousel({
	    loop:true,
	    autoplay: true,
	    margin:0,
	    animateOut: 'fadeOut',
	    animateIn: 'fadeIn',
	    nav:false,
	    autoplayHoverPause: false,
	    items: 1,
	    navText : ["<span class='ion-md-arrow-back'></span>","<span class='ion-chevron-right'></span>"],
	    responsive:{
	      0:{
	        items:1
	      },
	      600:{
	        items:1
	      },
	      1000:{
	        items:1
	      }
	    }
		});

		$('.author-slider').owlCarousel({
			autoplay: true,
			loop: true,
			items:1,
			margin: 30,
			stagePadding: 0,
			nav: true,
			dots: true,
			navText: ['<span class="ion-ios-arrow-back">', '<span class="ion-ios-arrow-forward">'],
			responsive:{
				0:{
					items: 1
				},
				600:{
					items: 1
				},
				1000:{
					items: 1
				}
			}
		});

	};
	carousel();

	

	var contentWayPoint = function() {
		var i = 0;
		$('.ftco-animate').waypoint( function( direction ) {

			if( direction === 'down' && !$(this.element).hasClass('ftco-animated') ) {
				
				i++;

				$(this.element).addClass('item-animate');
				setTimeout(function(){

					$('body .ftco-animate.item-animate').each(function(k){
						var el = $(this);
						setTimeout( function () {
							var effect = el.data('animate-effect');
							if ( effect === 'fadeIn') {
								el.addClass('fadeIn ftco-animated');
							} else if ( effect === 'fadeInLeft') {
								el.addClass('fadeInLeft ftco-animated');
							} else if ( effect === 'fadeInRight') {
								el.addClass('fadeInRight ftco-animated');
							} else {
								el.addClass('fadeInUp ftco-animated');
							}
							el.removeClass('item-animate');
						},  k * 50, 'easeInOutExpo' );
					});
					
				}, 100);
				
			}

		} , { offset: '95%' } );
	};
	contentWayPoint();

	var counter = function() {
		
		$('#section-counter').waypoint( function( direction ) {

			if( direction === 'down' && !$(this.element).hasClass('ftco-animated') ) {

				var comma_separator_number_step = $.animateNumber.numberStepFactories.separator(',')
				$('.number').each(function(){
					var $this = $(this),
						num = $this.data('number');
						console.log(num);
					$this.animateNumber(
					  {
					    number: num,
					    numberStep: comma_separator_number_step
					  }, 7000
					);
				});
				
			}

		} , { offset: '95%' } );

	}
	counter();


	// magnific popup
	$('.image-popup').magnificPopup({
    type: 'image',
    closeOnContentClick: true,
    closeBtnInside: false,
    fixedContentPos: true,
    // mainClass: 'mfp-no-margins mfp-with-zoom', // class to remove default margin from left and right side
     gallery: {
      enabled: true,
      navigateByImgClick: true,
      preload: [0,1] // Will preload 0 - before current, and 1 after the current image
    },
    image: {
      verticalFit: true
    },
    zoom: {
      enabled: true,
      duration: 300 // don't foget to change the duration also in CSS
    }
  });

  $('.popup-youtube, .popup-vimeo, .popup-gmaps').magnificPopup({
    disableOn: 700,
    type: 'iframe',
    mainClass: 'mfp-fade',
    removalDelay: 160,
    preloader: false,

    fixedContentPos: false
  });




})(jQuery);
