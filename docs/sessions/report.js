/* Progressive enhancement for animath session reports. Plain classic script (no
   modules), so it runs fine from file:// as well as over HTTP. Everything here is
   OPTIONAL: with JS disabled the report is still complete and readable — these
   helpers only add the auto-built table of contents, scroll-spy highlighting,
   expand/collapse-all, sortable tables, heading anchors, and a back-to-top button.

   Reports opt in with the standard skeleton:
     <link rel="stylesheet" href="../../report.css">
     <script defer src="../../report.js"></script>
     ... <nav class="toc" data-autobuild></nav> ... <div class="content"> ... </div>
*/
(function () {
  "use strict";

  function slug(text) {
    return text.toLowerCase().trim()
      .replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  }

  var content = document.querySelector(".content") || document.body;

  // 1. Give every h2/h3 in the content a stable id + a hover anchor link.
  var heads = Array.prototype.slice.call(content.querySelectorAll("h2, h3"));
  var seen = {};
  heads.forEach(function (h) {
    if (!h.id) {
      var base = slug(h.textContent) || "section";
      var id = base, n = 2;
      while (seen[id] || document.getElementById(id)) { id = base + "-" + n++; }
      h.id = id;
    }
    seen[h.id] = true;
    if (!h.querySelector(".anchor")) {
      var a = document.createElement("a");
      a.className = "anchor"; a.href = "#" + h.id; a.textContent = "#";
      a.setAttribute("aria-label", "Link to this section");
      h.appendChild(a);
    }
  });

  // 2. Auto-build the table of contents from h2 (and nested h3).
  var nav = document.querySelector("nav.toc");
  if (nav && (nav.hasAttribute("data-autobuild") || !nav.querySelector("a"))) {
    var ol = document.createElement("ol");
    heads.forEach(function (h) {
      var li = document.createElement("li");
      li.className = h.tagName === "H3" ? "lvl-3" : "lvl-2";
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent.replace(/#$/, "").trim();
      li.appendChild(a);
      ol.appendChild(li);
    });
    if (!nav.querySelector(".toc-title")) {
      var t = document.createElement("p"); t.className = "toc-title"; t.textContent = "Contents";
      nav.appendChild(t);
    }
    nav.appendChild(ol);

    // 3. Scroll-spy: highlight the TOC entry for the heading nearest the top.
    var links = {};
    Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
      links[a.getAttribute("href").slice(1)] = a;
    });
    if ("IntersectionObserver" in window) {
      var visible = {};
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
        var current = null;
        for (var i = 0; i < heads.length; i++) { if (visible[heads[i].id]) { current = heads[i].id; break; } }
        Array.prototype.forEach.call(nav.querySelectorAll("a.active"), function (a) { a.classList.remove("active"); });
        if (current && links[current]) { links[current].classList.add("active"); }
      }, { rootMargin: "0px 0px -75% 0px", threshold: 0 });
      heads.forEach(function (h) { obs.observe(h); });
    }
  }

  // 4. Expand / collapse all <details> via a toolbar (if present).
  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest ? ev.target.closest("[data-action]") : null;
    if (!btn) return;
    var act = btn.getAttribute("data-action");
    if (act === "expand-all" || act === "collapse-all") {
      var open = act === "expand-all";
      Array.prototype.forEach.call(document.querySelectorAll("details"), function (d) { d.open = open; });
    }
  });

  // 5. Sortable tables: click a <th data-sort> to sort its column.
  Array.prototype.forEach.call(document.querySelectorAll("th[data-sort]"), function (th) {
    th.addEventListener("click", function () {
      var table = th.closest("table");
      var tbody = table.tBodies[0];
      var idx = Array.prototype.indexOf.call(th.parentNode.children, th);
      var asc = th.getAttribute("data-dir") !== "asc";
      th.setAttribute("data-dir", asc ? "asc" : "desc");
      var rows = Array.prototype.slice.call(tbody.rows);
      rows.sort(function (a, b) {
        var x = (a.cells[idx] || {}).textContent || "", y = (b.cells[idx] || {}).textContent || "";
        var nx = parseFloat(x), ny = parseFloat(y);
        var cmp = (!isNaN(nx) && !isNaN(ny)) ? nx - ny : x.localeCompare(y);
        return asc ? cmp : -cmp;
      });
      rows.forEach(function (r) { tbody.appendChild(r); });
    });
  });

  // 6. Back-to-top button.
  var top = document.createElement("a");
  top.className = "totop"; top.href = "#"; top.textContent = "↑";
  top.setAttribute("aria-label", "Back to top");
  document.body.appendChild(top);
  window.addEventListener("scroll", function () {
    top.classList.toggle("show", window.scrollY > 600);
  }, { passive: true });
})();
