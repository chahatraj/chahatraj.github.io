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
		var isDark = storedTheme !== 'light';
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

		var applyTheme = function(dark) {
			$('body').toggleClass('dark-theme', dark);
			$button.attr({
				'aria-pressed': dark ? 'true' : 'false',
				'aria-label': dark ? 'Switch to light theme' : 'Switch to dark theme'
			});
			$icon.text(dark ? '☀' : '☾');
			$text.text(dark ? 'Light' : 'Dark');
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
		if (pageName !== 'news.html' && pageName !== 'publications.html') return;
		if ($('.back-to-top').length) return;
		var $button = $('<button class="back-to-top" type="button" aria-label="Back to top"><span class="back-to-top-arrow" aria-hidden="true"></span></button>');
		$('body').append($button);

		var updateButton = function() {
			$button.toggleClass('is-visible', $(window).scrollTop() > 180);
		};

		$button.on('click', function() {
			$('html, body').animate({ scrollTop: 0 }, 450);
		});
		$(window).on('scroll resize', updateButton);
		updateButton();
	};
	backToTop();

	var siteFooter = function() {
		var $main = $('#colorlib-main');
		if (!$main.length || $('.site-footer-note').length) return;
		var pageName = window.location.pathname.split('/').pop();
		if (!pageName || pageName === 'index.html') return;
		var fallbackDate = 'May 2, 2026';
		var lastModified = new Date(document.lastModified);
		var updatedDate = isNaN(lastModified.getTime()) ? fallbackDate : lastModified.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

		$main.append(
			'<footer class="site-footer-note">' +
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
