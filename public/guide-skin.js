/* guide-skin.js — shared skin switcher for the static animath guides.
   Reads/writes the SAME localStorage key as the app's chrome (skins.tsx), so a
   skin chosen in the app carries into the guides and vice versa. Applies
   [data-theme] + [data-scheme] on <html> as early as possible (run from <head>
   to avoid a flash), then mounts a small picker into <div id="skin-picker">.
   PROVISIONAL — the skin list is mirrored from src/chrome/skins.tsx. */
(function () {
  var SKINS = [
    { id: 'dark',      name: 'Observatory', blurb: 'Ink blue · refined gold',        dots: ['#0a0c12', '#ffce47', '#5fe3cd'] },
    { id: 'light',     name: 'Paper',       blurb: 'Warm paper · deep amber',        dots: ['#f0ede4', '#b67d10', '#1d8a78'], light: true },
    { id: 'neon',      name: 'Spectrum',    blurb: 'Space black · cyan + magenta',   dots: ['#05060f', '#34e6cf', '#ff5aa6'] },
    { id: 'blueprint', name: 'Blueprint',   blurb: 'Drafting blue · chalk lines',    dots: ['#102650', '#f2f6ff', '#69a8ff'] },
    { id: 'phosphor',  name: 'Phosphor',    blurb: 'CRT green · all mono',           dots: ['#04130a', '#3dff7a', '#b5ffce'] },
    { id: 'daylight',  name: 'Daylight',    blurb: 'Cool white · clear blue',        dots: ['#eef2f8', '#2f6fe0', '#e0683a'], light: true },
    { id: 'primary',   name: 'Primary',     blurb: 'Bauhaus · bold primaries',       dots: ['#f0eee8', '#f5c518', '#1f4fd6'], light: true },
    { id: 'mirage',    name: 'Mirage',      blurb: 'Surreal dusk · peach + lavender', dots: ['#1a1230', '#ffb37a', '#b08cff'] }
  ];
  var KEY = 'animath:v1:chrome:skin', DEFAULT = 'dark';

  function byId(id) { return SKINS.filter(function (s) { return s.id === id; })[0]; }
  function isLight(id) { var s = byId(id); return !!(s && s.light); }
  function load() {
    try { var r = localStorage.getItem(KEY); if (r && byId(r)) return r; } catch (e) { /* private mode */ }
    return DEFAULT;
  }
  function apply(id) {
    var el = document.documentElement;
    el.setAttribute('data-theme', id);
    el.setAttribute('data-scheme', isLight(id) ? 'light' : 'dark');
  }
  function save(id) { try { localStorage.setItem(KEY, id); } catch (e) { /* ignore */ } }

  // Apply the saved skin immediately (before first paint when loaded in <head>).
  apply(load());

  function dotsHtml(arr) {
    return '<span class="gs-dots">' + arr.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>';
  }
  function btnHtml(id) {
    var s = byId(id) || SKINS[0];
    return dotsHtml(s.dots) + '<span class="gs-name">' + s.name + '</span><span style="opacity:.6">▾</span>';
  }

  function mount() {
    var host = document.getElementById('skin-picker');
    if (!host) return;
    host.classList.add('gs');
    host.innerHTML = '<button class="gs-btn" aria-haspopup="true" title="Skin">' + btnHtml(load()) + '</button>';
    var btn = host.querySelector('.gs-btn');
    var menu = null;

    function close() {
      if (menu) { menu.remove(); menu = null; document.removeEventListener('click', onDoc); }
    }
    function onDoc(e) { if (menu && !host.contains(e.target)) close(); }
    function open() {
      menu = document.createElement('div');
      menu.className = 'gs-menu';
      menu.innerHTML = SKINS.map(function (s) {
        return '<button class="gs-item' + (s.id === load() ? ' on' : '') + '" data-id="' + s.id + '">'
          + dotsHtml(s.dots)
          + '<span class="gs-meta"><b>' + s.name + '</b><span>' + s.blurb + '</span></span></button>';
      }).join('');
      host.appendChild(menu);
      Array.prototype.forEach.call(menu.querySelectorAll('.gs-item'), function (it) {
        it.addEventListener('click', function () {
          var id = it.getAttribute('data-id');
          apply(id); save(id); close();
          btn.innerHTML = btnHtml(id);
        });
      });
      setTimeout(function () { document.addEventListener('click', onDoc); }, 0);
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu) close(); else open();
    });
  }

  if (document.readyState !== 'loading') mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
