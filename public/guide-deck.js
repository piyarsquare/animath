/* guide-deck.js — a progressive-enhancement stepper for the animath guides.
   ----------------------------------------------------------------------------
   Finds the <section class="slide"> blocks inside <main> and turns them into a
   navigable deck: one slide at a time, Back/Next + keyboard (←/→/space/Home/End)
   + clickable progress dots + touch swipe, a deep-link hash per slide, and a
   lazy mount hook for interactive widgets (window.GuideWidgets[key], invoked the
   first time a slide carrying [data-widget=key] becomes active).

   With JS off the `body.deck` class is never added, so guide-deck.css stays inert
   and the slides render as a plain scroll page. Reusable across guides; no deps. */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var main = document.querySelector('main');
    if (!main) return;
    var slides = Array.prototype.slice.call(main.querySelectorAll('section.slide'));
    if (slides.length < 2) return; // nothing to step through — leave as a scroll page

    document.body.classList.add('deck');
    // We own scrolling; stop the browser from re-jumping to the #id fragment at
    // load (which would align the active slide's top under the sticky bar).
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    // Ids are carried as data-sid (not id) in the markup so the browser finds no
    // fragment target at parse time and never auto-scrolls; we assign them here.
    slides.forEach(function (s, i) { if (!s.id) s.id = s.dataset.sid || ('s' + (i + 1)); });

    var idx = 0;

    // ---- control bar ----
    var bar = document.createElement('div');
    bar.className = 'deck-bar';
    bar.innerHTML =
      '<div class="deck-bar-inner">' +
        '<button class="deck-btn deck-prev" type="button">← Back</button>' +
        '<div class="deck-rail"></div>' +
        '<span class="deck-count" aria-live="polite"></span>' +
        '<button class="deck-btn deck-next" type="button">Next →</button>' +
      '</div>';
    document.body.appendChild(bar);
    var prevBtn = bar.querySelector('.deck-prev');
    var nextBtn = bar.querySelector('.deck-next');
    var rail = bar.querySelector('.deck-rail');
    var count = bar.querySelector('.deck-count');

    var dots = slides.map(function (s, i) {
      var d = document.createElement('button');
      d.className = 'deck-dot';
      d.type = 'button';
      d.setAttribute('aria-label', 'Go to step ' + (i + 1));
      d.addEventListener('click', function () { go(i); });
      rail.appendChild(d);
      return d;
    });

    function clamp(i) { return Math.max(0, Math.min(slides.length - 1, i)); }

    // lazily initialize any interactive widgets on a slide (once)
    function mount(slide) {
      var hosts = slide.querySelectorAll('[data-widget]');
      Array.prototype.forEach.call(hosts, function (host) {
        if (host.dataset.mounted) return;
        var init = window.GuideWidgets && window.GuideWidgets[host.getAttribute('data-widget')];
        if (typeof init === 'function') {
          init(host);
          host.dataset.mounted = '1';
        }
      });
    }

    function go(i, opts) {
      opts = opts || {};
      i = clamp(i);
      var dir = i < idx ? 'back' : 'fwd';
      idx = i;
      slides.forEach(function (s, k) {
        var on = k === i;
        s.classList.toggle('is-active', on);
        if (on) s.setAttribute('data-dir', dir);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
      count.textContent = (i + 1) + ' / ' + slides.length;
      prevBtn.disabled = i === 0;
      nextBtn.disabled = i === slides.length - 1;
      mount(slides[i]);
      if (!opts.noHash) history.replaceState(null, '', '#' + slides[i].id);
      if (!opts.noScroll) window.scrollTo(0, 0);
    }

    prevBtn.addEventListener('click', function () { go(idx - 1); });
    nextBtn.addEventListener('click', function () { go(idx + 1); });

    document.addEventListener('keydown', function (e) {
      // don't hijack arrows/space while the reader is typing in a widget field
      var t = e.target.tagName || '';
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || e.target.isContentEditable) return;
      if (e.key === 'ArrowRight') go(idx + 1);
      else if (e.key === 'ArrowLeft') go(idx - 1);
      else if (e.key === ' ') { e.preventDefault(); go(idx + 1); }
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(slides.length - 1);
    });

    // touch swipe (horizontal)
    var sx = null, sy = null;
    main.addEventListener('touchstart', function (e) {
      // don't read a swipe when the touch starts on an interactive widget/control
      if (e.target.closest && e.target.closest('[data-widget], input, button, a, select')) { sx = null; return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    main.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      sx = sy = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) go(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });

    function indexFromHash() {
      var h = (location.hash || '').replace('#', '');
      var n = slides.findIndex(function (s) { return s.id === h; });
      return n < 0 ? 0 : n;
    }
    window.addEventListener('hashchange', function () { go(indexFromHash(), { noHash: true }); });
    go(indexFromHash());
    // The browser's fragment scroll can fire as late as the load event; re-pin
    // the top once more after it so the active slide's heading clears the bar.
    window.addEventListener('load', function () { window.scrollTo(0, 0); });
  });
})();
