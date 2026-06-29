/* guide-widgets.js — interactive figures for the animath guides.
   ----------------------------------------------------------------------------
   Each widget is a factory keyed in window.GuideWidgets; guide-deck.js calls it
   with the host element the first time its slide becomes active (or you can call
   it directly for a non-deck page). Widgets are self-contained vanilla SVG, lean
   on the shared skin tokens (via guide-deck.css classes), and accept three input
   modes — drag a handle, type a value, or choose a preset.

   add-line — addition on the real line as tip-to-tail arrows: a + b = sum, with
   draggable arrowheads. The trivial arithmetic lives here on purpose (the line
   needs no engine); the plane-and-beyond widgets will embed the tested
   numberPlanes.ts engine via #/embed/ applets instead of re-deriving math. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function minus(v) { return v < 0 ? '−' + Math.abs(v) : String(v); } // proper minus glyph

  window.GuideWidgets = window.GuideWidgets || {};

  window.GuideWidgets['add-line'] = function (host) {
    // ----- geometry: domain [-D, D] holds any sum of two addends in [-LIM, LIM] -----
    var D = 12, LIM = 6;
    var X0 = 40, X1 = 620, Y = 120, W = 660, H = 170;
    var unit = (X1 - X0) / (2 * D);
    function px(v) { return X0 + (v + D) * unit; }
    function val(clientX, svg) {
      var r = svg.getBoundingClientRect();
      var sx = (clientX - r.left) * (W / r.width); // viewBox x
      return Math.round((sx - X0) / unit - D);
    }

    var a = 3, b = -5; // opens on the page's running example: 3 + (-5) = -2

    // ----- scaffold -----
    host.innerHTML =
      '<svg class="w-fig" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
        'aria-label="Drag the arrowheads to add two numbers on the line.">' +
        '<defs>' +
          '<marker id="wahA" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">' +
            '<path d="M0,0 L8,3 L0,6 Z" fill="var(--accent)"/></marker>' +
          '<marker id="wahB" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">' +
            '<path d="M0,0 L8,3 L0,6 Z" fill="var(--accent2)"/></marker>' +
        '</defs>' +
        '<g class="w-ticks"></g>' +
        '<line class="w-axis" x1="' + X0 + '" y1="' + Y + '" x2="' + X1 + '" y2="' + Y + '"/>' +
        '<g class="w-draw"></g>' +
      '</svg>' +
      '<div class="w-eq"><span class="wv a"></span> + <span class="wv b"></span> = <span class="wv s"></span></div>' +
      '<div class="w-controls">' +
        '<label>a&nbsp; <input class="w-in a" type="number" min="-' + LIM + '" max="' + LIM + '" step="1"></label>' +
        '<label>b&nbsp; <input class="w-in b" type="number" min="-' + LIM + '" max="' + LIM + '" step="1"></label>' +
        '<span class="w-presets">try:' +
          '<button class="w-chip" data-a="3" data-b="-5">3, −5</button>' +
          '<button class="w-chip" data-a="-4" data-b="-2">−4, −2</button>' +
          '<button class="w-chip" data-a="5" data-b="4">5, 4</button>' +
        '</span>' +
      '</div>' +
      '<p class="w-hint">Drag an arrowhead, type a value, or pick a pair — the tail of <b>b</b> rides the tip of <b>a</b>.</p>';

    var svg = host.querySelector('svg');
    var ticks = host.querySelector('.w-ticks');
    var draw = host.querySelector('.w-draw');
    var eqA = host.querySelector('.wv.a'), eqB = host.querySelector('.wv.b'), eqS = host.querySelector('.wv.s');
    var inA = host.querySelector('.w-in.a'), inB = host.querySelector('.w-in.b');

    // ----- static ticks (every 1; labels every 3) -----
    for (var t = -D; t <= D; t++) {
      var big = (t % 3 === 0);
      ticks.appendChild(el('line', { class: 'w-tick', x1: px(t), y1: Y - (big ? 7 : 4), x2: px(t), y2: Y + (big ? 7 : 4) }));
      if (big) {
        var lab = el('text', { class: t === 0 ? 'w-zero' : 'w-tlab', x: px(t), y: Y + 24 });
        lab.textContent = t === 0 ? '0' : minus(t);
        ticks.appendChild(lab);
      }
    }

    // ----- the parts we redraw -----
    var yA = 86, yB = 58;
    var arrA = el('line', { class: 'w-arrA', 'marker-end': 'url(#wahA)', y1: yA, y2: yA });
    var arrB = el('line', { class: 'w-arrB', 'marker-end': 'url(#wahB)', y1: yB, y2: yB });
    var dot = el('circle', { class: 'w-resdot', cy: Y, r: 5 });
    var labA = el('text', { class: 'w-vlab a', 'text-anchor': 'middle', y: yA - 11 });
    var labB = el('text', { class: 'w-vlab b', 'text-anchor': 'middle', y: yB - 11 });
    [arrA, arrB, dot, labA, labB].forEach(function (n) { draw.appendChild(n); });

    function handle(cls) {
      var g = el('g', { class: 'w-handle ' + cls });
      g.appendChild(el('circle', { class: 'hit', r: 18 }));
      g.appendChild(el('circle', { class: 'ring', r: 13 }));
      g.appendChild(el('circle', { class: 'knob', r: 8 }));
      draw.appendChild(g);
      return g;
    }
    var hA = handle('a'), hB = handle('b');

    // ----- render from state -----
    function render() {
      var sum = a + b;
      arrA.setAttribute('x1', px(0)); arrA.setAttribute('x2', px(a));
      arrB.setAttribute('x1', px(a)); arrB.setAttribute('x2', px(sum));
      dot.setAttribute('cx', px(sum));
      labA.setAttribute('x', (px(0) + px(a)) / 2); labA.textContent = minus(a);
      labB.setAttribute('x', (px(a) + px(sum)) / 2); labB.textContent = (b < 0 ? '−' : '+') + Math.abs(b);
      hA.setAttribute('transform', 'translate(' + px(a) + ',' + yA + ')');
      hB.setAttribute('transform', 'translate(' + px(sum) + ',' + yB + ')');
      eqA.textContent = minus(a); eqB.textContent = minus(b); eqS.textContent = minus(sum);
      if (document.activeElement !== inA) inA.value = a;
      if (document.activeElement !== inB) inB.value = b;
    }

    function setA(v) { a = clamp(v, -LIM, LIM); render(); }            // b fixed; sum rides along
    function setSum(v) { var s = clamp(v, a - LIM, a + LIM); b = s - a; render(); } // a fixed; b = sum - a

    // ----- drag -----
    function drag(g, onMove) {
      g.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        g.setPointerCapture(e.pointerId);
        g.classList.add('dragging');
        var move = function (ev) { onMove(val(ev.clientX, svg)); };
        var up = function (ev) {
          g.classList.remove('dragging');
          try { g.releasePointerCapture(e.pointerId); } catch (x) {}
          g.removeEventListener('pointermove', move);
          g.removeEventListener('pointerup', up);
          g.removeEventListener('pointercancel', up);
        };
        g.addEventListener('pointermove', move);
        g.addEventListener('pointerup', up);
        g.addEventListener('pointercancel', up);
      });
    }
    drag(hA, setA);
    drag(hB, function (sum) { setSum(sum); });

    // ----- type -----
    inA.addEventListener('input', function () { if (this.value !== '' && this.value !== '-') setA(parseInt(this.value, 10) || 0); });
    inB.addEventListener('input', function () {
      if (this.value === '' || this.value === '-') return;
      var nb = clamp(parseInt(this.value, 10) || 0, -LIM, LIM); b = nb; render();
    });

    // ----- choose -----
    host.querySelectorAll('.w-chip').forEach(function (c) {
      c.addEventListener('click', function () {
        a = clamp(parseInt(c.getAttribute('data-a'), 10), -LIM, LIM);
        b = clamp(parseInt(c.getAttribute('data-b'), 10), -LIM, LIM);
        render();
      });
    });

    render();
  };
})();
