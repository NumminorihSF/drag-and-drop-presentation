/**
 * Shower HTML presentation engine: github.com/shower/shower
 * @copyright 2010–2013 Vadim Makeev, pepelsbey.net
 * @license MIT license: github.com/shower/shower/wiki/MIT-License
 */
window.shower = (function(window, document, undefined) {
	var shower = {},
		url = window.location,
		body = document.body,
		slides = document.querySelectorAll('.slide'),
		progress = document.querySelector('div.progress div'),
		slideList = [],
		timer,
		isHistoryApiSupported = !!(window.history && history.pushState),
		l = slides.length, i;

	/**
	* Get value at named data store for the DOM element.
	* @private
	* @param {domElem} element
	* @param {String} name
	* @returns {String}
	*/
	shower._getData = function(element, name) {
		return element.dataset ? element.dataset[name] : element.getAttribute('data-' + name);
	};

	for (i = 0; i < l; i++) {
		// Slide IDs are optional. In case of missing ID we set it to the
		// slide number
		if ( ! slides[i].id) {
			slides[i].id = i + 1;
		}

		slideList.push({
			id: slides[i].id,
			hasInnerNavigation: null !== slides[i].querySelector('.next'),
			hasTiming: (shower._getData(slides[i], 'timing') && shower._getData(slides[i], 'timing').indexOf(':') !== -1)
		});
	}

	/**
	* Get slide scale value
	* @private
	* @returns {String}
	*/
	shower._getTransform = function() {
		var denominator = Math.max(
			body.clientWidth / window.innerWidth,
			body.clientHeight / window.innerHeight
		);

		return 'scale(' + (1 / denominator) + ')';
	};

	/**
	* Set CSS transform with prefixes to body
	* @private
	* @returns {Boolean}
	*/
	shower._applyTransform = function(transform) {
		body.style.WebkitTransform = transform;
		body.style.MozTransform = transform;
		body.style.msTransform = transform;
		body.style.OTransform = transform;
		body.style.transform = transform;

		return true;
	};

	/**
	* Check if arg is number.
	* @private
	* @param {Number|whatelse} arg Any type
	* @returns {Boolean}
	*/
	shower._isNumber = function(arg) {
		if ( ! ( ! isNaN(parseFloat(arg)) && isFinite(arg))) {
			return false;
		}

		return true;
	};

	/**
	* Normalize slide number.
	* @private
	* @param {Number} slideNumber slide number (sic!)
	* @returns {Number}
	*/
	shower._normalizeSlideNumber = function(slideNumber) {
		if ( ! shower._isNumber(slideNumber)) {
			throw new Error('Gimme slide number as Number, baby!');
		}

		if (slideNumber < 0) {
			slideNumber = 0;
		}

		if (slideNumber >= slideList.length) {
			slideNumber = slideList.length - 1;
		}

		return slideNumber;
	};

	/**
	* Get slide id from HTML element.
	* @private
	* @param {domElem} el
	* @returns {String}
	*/
	shower._getSlideIdByEl = function(el) {
		while ('BODY' !== el.nodeName && 'HTML' !== el.nodeName) {
			if (el.classList.contains('slide')) {
				return el.id;
			} else {
				el = el.parentNode;
			}
		}

		return '';
	};

	/**
	* For touch devices: check if click on links...
	*
	* @TODO: add support for textareas/inputs/...
	*
	* @private
	* @param {domElem} e
	* @returns {Boolean}
	*/
	shower._checkInteractiveElement = function(e) {
		if ('A' === e.target.nodeName) {
			return true;
		} else {
			return false;
		}
	};

	/**
	* Get slide number by slideId
	* @param {Number} slideId (HTML id or position in slideList)
	* @returns {Number}
	*/
	shower.getSlideNumber = function(slideId) {
		var i = slideList.length - 1,
			slideNumber;

		if (slideId === '') {
			slideNumber = 0;
		}

		// As fast as you can ;-)
		// http://jsperf.com/for-vs-foreach/46
		for (; i >= 0; --i) {
			if (slideId === slideList[i].id) {
				slideNumber = i;
				break;
			}
		}

		return slideNumber;
	};


	/**
	* Show next slide. If slide is last returns false, otherwise return slide
	* number which been shown.
	* @param {Function} callback runs only if shower.next() complete successfully
	* @returns {Number|Boolean}
	*/
	shower.next = function(callback) {
		var currentSlideNumber = shower.getCurrentSlideNumber(),
			ret;

		// Only go to next slide if current slide have no inner
		// navigation or inner navigation is fully shown
		// NOTE: But first of all check if there is no current slide
		if (
			-1 === currentSlideNumber ||
			!slideList[currentSlideNumber].hasInnerNavigation ||
			-1 === shower.increaseInnerNavigation(currentSlideNumber)
		) {
			shower.go(currentSlideNumber + 1);
			// slides starts from 0
			ret = currentSlideNumber + 2;

			if (typeof(callback) === 'function') {
				callback();
			}
		} else {
			ret = false;
		}

		return ret;
	};

	/**
	* Show previous slide. If slide is first returns false, otherwise return slide
	* number which been shown.
	* @param {Function} callback runs only if shower.previous() complete successfully
	* @returns {Number|Boolean}
	*/
	shower.previous = function(callback) {
		var currentSlideNumber = shower.getCurrentSlideNumber(),
			ret;

		// slides starts from 0
		if (currentSlideNumber > 0) {
			ret = currentSlideNumber;
			shower.go(currentSlideNumber - 1);

			if (typeof(callback) === 'function') {
				callback();
			}
		} else {
			ret = false;
		}

		return ret;
	};

	/**
	* Show first slide.
	* @param {Function} callback
	* @returns {Number}
	*/
	shower.first = function(callback) {
		if (typeof(callback) === 'function') {
			callback();
		}

		return shower.go(0);
	};

	/**
	* Show last slide.
	* @param {Function} callback
	* @returns {Number}
	*/
	shower.last = function(callback) {
		if (typeof(callback) === 'function') {
			callback();
		}
		return shower.go(slideList.length - 1);
	};

	/**
	* Switch to slide view.
	* @param {Function} callback runs only if shower.enterSlideMode() complete successfully
	* @returns {Number|Boolean}
	*/
	shower.enterSlideMode = function(callback) {
		var currentSlideNumber = shower.getCurrentSlideNumber();

		if (currentSlideNumber === -1) {
			currentSlideNumber = 0;
		}

		shower.go(currentSlideNumber);
		shower.showPresenterNotes(currentSlideNumber);

		if (shower.isListMode() && isHistoryApiSupported) {
			history.pushState(null, null, url.pathname + '?full' + shower.getSlideHash(currentSlideNumber));
		}

		body.classList.remove('list');
		body.classList.add('full');

		if (window.console && window.console.clear) {
			console.clear();
		}

		shower.updateProgress(currentSlideNumber);
		shower.updateCurrentAndPassedSlides(currentSlideNumber);
		shower.runSlideshowIfPresented(currentSlideNumber);

		if (typeof(callback) === 'function') {
			callback();
		}

		return shower._applyTransform(shower._getTransform());
	};

	/**
	* Switch to list view.
	* @param {Function} callback runs only if shower.enterListMode() complete successfully
	* @returns {Number}
	*/
	shower.enterListMode = function(callback) {
		var currentSlideNumber = shower.getCurrentSlideNumber();

		body.classList.remove('full');
		body.classList.add('list');

		if (shower.isSlideMode() && isHistoryApiSupported) {
			history.pushState(null, null, url.pathname + shower.getSlideHash(currentSlideNumber));
		}

		shower.scrollToSlide(currentSlideNumber);

		if (typeof(callback) === 'function') {
			callback();
		}

		return shower._applyTransform('none');
	};

	/**
	* Toggle Mode: Slide and List
	* @param {Function} callback
	*/
	shower.toggleMode = function(callback) {
		if (shower.isListMode()) {
			shower.enterSlideMode();
		} else {
			shower.enterListMode();
		}

		if (typeof(callback) === 'function') {
			callback();
		}

		return true;
	};

	/**
	* Get current slide number. Starts from zero. Warning: when in url you have
	* slide number 1 this method will return 0.
	* If something wrong return -1.
	* @returns {Number}
	*/
	shower.getCurrentSlideNumber = function() {
		var i = slideList.length - 1,
			currentSlideId = url.hash.substr(1);

		// As fast as you can ;-)
		// http://jsperf.com/for-vs-foreach/46
		for (; i >= 0; --i) {
			if (currentSlideId === slideList[i].id) {
				return i;
			}
		}

		return -1;
	};

	/**
	* Scroll to slide.
	* @param {Number} slideNumber slide number (sic!)
	* @returns {Undefined|Boolean}
	*/
	shower.scrollToSlide = function(slideNumber) {
		var currentSlide,
			ret;

		if ( ! shower._isNumber(slideNumber)) {
			throw new Error('Gimme slide number as Number, baby!');
		}

		if (shower.isSlideMode()) {
			throw new Error('You can\'t scroll to because you in slide mode. Please, switch to list mode.');
		}

		// @TODO: WTF?
		if (-1 === slideNumber) {
			return;
		}

		if (slideList[slideNumber]) {
			currentSlide = document.getElementById(slideList[slideNumber].id);
			window.scrollTo(0, currentSlide.offsetTop);
			ret = true;
		} else {
			throw new Error('There is no slide with number ' + slideNumber);
		}

		return ret;
	};

	/**
	* Check if it's List mode.
	* @returns {Boolean}
	*/
	shower.isListMode = function() {
		return isHistoryApiSupported ? ! /^full.*/.test(url.search.substr(1)) : body.classList.contains('list');
	};

	/**
	* Check if it's Slide mode.
	* @returns {Boolean}
	*/
	shower.isSlideMode = function() {
		return isHistoryApiSupported ? /^full.*/.test(url.search.substr(1)) : body.classList.contains('full');
	};

	/**
	* Update progress bar.
	* @param {Number} slideNumber slide number (sic!)
	* @returns {Boolean}
	*/
	shower.updateProgress = function(slideNumber) {
		// if progress bar doesn't exist
		if (null === progress) {
			return false;
		}

		if ( ! shower._isNumber(slideNumber)) {
			throw new Error('Gimme slide number as Number, baby!');
		}

		progress.style.width = (100 / (slideList.length - 1) * shower._normalizeSlideNumber(slideNumber)).toFixed(2) + '%';

		return true;
	};

	/**
	* Update current and passed slides.
	* @param {Number} slideNumber slide number (sic!)
	* @returns {Boolean}
	*/
	shower.updateCurrentAndPassedSlides = function(slideNumber) {
		var i,
			slide,
			l = slideList.length;

		slideNumber = shower._normalizeSlideNumber(slideNumber);

		if ( ! shower._isNumber(slideNumber)) {
			throw new Error('Gimme slide number as Number, baby!');
		}

		for (i = 0; i < l; ++i) {
			slide = document.getElementById(slideList[i].id);

			if (i < slideNumber) {
				slide.classList.remove('active');
				slide.classList.add('visited');
			} else if (i > slideNumber) {
				slide.classList.remove('visited');
				slide.classList.remove('active');
			} else {
				slide.classList.remove('visited');
				slide.classList.add('active');
			}
		}

		return true;
	};

	/**
	* Show presenter notes in console.
	* @param {Number} slideNumber slide number (sic!). Attention: starts from zero.
	*/
	shower.showPresenterNotes = function(slideNumber) {
		if (window.console) {
			slideNumber = shower._normalizeSlideNumber(slideNumber);

			var slideId = slideList[slideNumber].id,
				nextSlideId = slideList[slideNumber + 1] ? slideList[slideNumber + 1].id : null,
				notes = document.getElementById(slideId).querySelector('footer');

			if (notes) {
				console.info(notes.innerHTML.replace(/\n\s+/g,'\n'));
			}

			if (nextSlideId) {
				var next = document.getElementById(nextSlideId).querySelector('h2');

				if (next) {
					next = next.innerHTML.replace(/^\s+|<[^>]+>/g,'');
					console.info('NEXT: ' + next);
				}
			}
		}
	};

	/**
	* Get slide hash.
	* @param {Number} slideNumber slide number (sic!). Attention: starts from zero.
	* @returns {Boolean}
	*/
	shower.getSlideHash = function(slideNumber) {
		if ( ! shower._isNumber(slideNumber)) {
			throw new Error('Gimme slide number as Number, baby!');
		}

		slideNumber = shower._normalizeSlideNumber(slideNumber);

		return '#' + slideList[slideNumber].id;
	};

	/**
	* Go to slide number...
	* @param {Number} slideNumber slide number (sic!). Attention: starts from zero.
	* @param {Function} callback runs only if you not in List mode
	* @returns {Number}
	*/
	shower.go = function(slideNumber, callback) {
		if ( ! shower._isNumber(slideNumber)) {
			throw new Error('Gimme slide number as Number, baby!');
		}

		url.hash = shower.getSlideHash(slideNumber);

		if (shower.isSlideMode()) {
			shower.updateProgress(slideNumber);
			shower.updateCurrentAndPassedSlides(slideNumber);
			shower.showPresenterNotes(slideNumber);

			if (typeof(callback) === 'function') {
				callback();
			}
		}

		return slideNumber;
	};

	/**
	* Run slide show if presented.
	* @param {Number} slideNumber
	* @returns {Undefined}
	*/
	shower.runSlideshowIfPresented = function(slideNumber) {
		if ( ! shower._isNumber(slideNumber)) {
			throw new Error('Gimme slide number as Number, baby!');
		}

		slideNumber = shower._normalizeSlideNumber(slideNumber);

		clearTimeout(timer);

		if (slideList[slideNumber].hasTiming) {
			// Compute number of milliseconds from format "X:Y", where X is
			// number of minutes, and Y is number of seconds
			var timing = shower._getData(document.getElementById(slideList[slideNumber].id), 'timing').split(':');
			timing = parseInt(timing[0], 10) * 60 * 1000 + parseInt(timing[1], 10) * 1000;

			timer = setTimeout(function() {
					shower.go(slideNumber + 1);
					shower.runSlideshowIfPresented(slideNumber + 1);
				},
				timing);
		}
	};

	/**
	* Increases inner navigation by adding 'active' class to next inactive inner navigation item
	* @param {Number} slideNumber
	* @returns {Number}
	*/
	shower.increaseInnerNavigation = function(slideNumber) {
		var nextNodes,
			node,
			ret = -1;

		if ( ! shower._isNumber(slideNumber)) {
			throw new Error('Gimme slide number as Number, baby!');
		}

		// If inner navigation in this slide...
		if (slideList[slideNumber].hasInnerNavigation) {
			nextNodes = document.getElementById(slideList[slideNumber].id).querySelectorAll('.next:not(.active)');

			if (0 !== nextNodes.length) {
				node = nextNodes[0];
				node.classList.add('active');
				ret = nextNodes.length - 1;
			}
		}

		return ret;
	};




	// Event handlers

	window.addEventListener('DOMContentLoaded', function() {
		if (shower.isSlideMode()) {
			shower.enterSlideMode();
		}
	}, false);

	window.addEventListener('popstate', function(e) {
		if (shower.isListMode()) {
			shower.enterListMode();
		} else {
			shower.enterSlideMode();
		}
	}, false);

	window.addEventListener('resize', function(e) {
		if (shower.isSlideMode()) {
			shower._applyTransform(shower._getTransform());
		}
	}, false);

	document.addEventListener('keydown', function(e) {
		// Shortcut for alt, ctrl and meta keys
		if (e.altKey || e.ctrlKey || e.metaKey) { return; }

		var currentSlideNumber = shower.getCurrentSlideNumber(),
			innerNavigationCompleted = true;

		switch (e.which) {
			case 116: // F5
				e.preventDefault();

				if (shower.isListMode()) {
					var slideNumber = e.shiftKey ? currentSlideNumber : 0;

					shower.go(slideNumber);
					shower.enterSlideMode();
				} else {
					shower.enterListMode();
				}
			break;

			case 13: // Enter
				if (shower.isListMode() && -1 !== currentSlideNumber) {
					e.preventDefault();
					shower.enterSlideMode();
				}
			break;

			case 27: // Esc
				if (shower.isSlideMode()) {
					e.preventDefault();
					shower.enterListMode();
				}
			break;

			case 33: // PgUp
			case 38: // Up
			case 37: // Left
			case 72: // h
			case 75: // k
				e.preventDefault();
				shower.previous();
			break;

			case 34: // PgDown
			case 40: // Down
			case 39: // Right
			case 76: // l
			case 74: // j
				e.preventDefault();

				if (shower.isSlideMode()) {
					// Inner navigation is "completed" if current slide have
					// no inner navigation or inner navigation is fully shown
					innerNavigationCompleted = !slideList[currentSlideNumber].hasInnerNavigation ||
						-1 === shower.increaseInnerNavigation(currentSlideNumber);
				} else {
					// Also inner navigation is always "completed" if we are in
					// list mode
					innerNavigationCompleted = true;
				}
				// NOTE: First of all check if there is no current slide
				if (
					-1 === currentSlideNumber || innerNavigationCompleted
				) {
					currentSlideNumber++;
					shower.go(currentSlideNumber);
					// We must run slideshow only in full mode
					if (shower.isSlideMode()) {
						shower.runSlideshowIfPresented(currentSlideNumber);
					}
				}
			break;

			case 36: // Home
				e.preventDefault();
				shower.first();
			break;

			case 35: // End
				e.preventDefault();
				shower.last();
			break;

			case 9: // Tab = +1; Shift + Tab = -1
			case 32: // Space = +1; Shift + Space = -1
				e.preventDefault();
				shower[e.shiftKey ? 'previous' : 'next']();
			break;

			default:
				// Behave as usual
		}
	}, false);

	document.addEventListener('click', function(e) {
		if (shower.isListMode() && shower._getSlideIdByEl(e.target)) {
			e.preventDefault();
			shower.go(shower.getSlideNumber(shower._getSlideIdByEl(e.target)));
			shower.enterSlideMode();
		}
	}, false);

	document.addEventListener('touchstart', function(e) {
		if (shower._getSlideIdByEl(e.target)) {
			if (shower.isSlideMode() && ! shower._checkInteractiveElement(e)) {
				var x = e.touches[0].pageX;

				if (x > window.innerWidth / 2) {
					shower.next();
				} else {
					shower.previous();
				}
			}

			if (shower.isListMode()) {
				shower.go(shower.getSlideNumber(shower._getSlideIdByEl(e.target)));
				shower.enterSlideMode();
			}
		}
		

	}, false);

	document.addEventListener('touchmove', function(e) {
		if (shower.isSlideMode()) {
			e.preventDefault();
		}
	}, false);

	return shower;

})(this, this.document);