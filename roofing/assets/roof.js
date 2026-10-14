/*
  The roof illustration for /roofing/. Same interface as the landscape yard
  (window.DGBYard.build(svg, mode) -> { tl }), so the shared main.js pins it
  and drives it with scroll. Stages (one timeline unit each):
    1 find the problem, 2 tear-off, 3 underlayment, 4 new shingles, 5 fascia, 6 done.
  Drawn as a flat front elevation: the roof plane is a trapezoid of horizontal courses.
*/
window.DGBYard = (function () {
  var NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var C = {
    sky1: "#BFDFEA", sky2: "#EDF5F0", sun: "#F5C431",
    mtFar: "#DCD2C1", mtNear: "#BDAC95", mtLight: "#CDBFA9",
    ground: "#DCCBA8", gravel: "#C9B892",
    wall: "#EDE3D0", wallShade: "#DDD0B8", trim: "#CFC2A9", charcoal: "#34353C", glass: "#DDE9EE", door: "#4A4B52",
    deck: "#C9A46F", deckSeam: "#AE8A57",
    oldTabs: ["#8C8E92", "#7E8084", "#979A9E", "#86888C"], patch: ["#8A6E52", "#7C6248"],
    felt: "#3E4048", feltLap: "#55575F",
    newTabs: ["#3A3C42", "#44464D", "#404249", "#4B4D54"], tabLine: "#25262B", ridge: "#2C2D32",
    fasciaOld: "#A08E74", fasciaRot: "#7E6A50", fasciaNew: "#F1EBDF", dripEdge: "#34353C",
    stain: "#B49A72", drop: "#6FA8DC", ring: "#F5C431",
    agave: "#7C9A63", agaveDark: "#55744A", cactus: "#5F8539"
  };

  var MODES = {
    // eave/ridge lines of the roof plane, wall box, ground line
    landscape: { w: 1200, h: 800, eaveY: 540, ridgeY: 330, eL: 650, eR: 1195, rL: 800, rR: 1045,
      wallL: 680, wallR: 1165, groundY: 720, tab: 30, row: 15 },
    portrait: { w: 600, h: 1200, eaveY: 900, ridgeY: 690, eL: 25, eR: 575, rL: 170, rR: 430,
      wallL: 55, wallR: 545, groundY: 1080, tab: 26, row: 15 }
  };

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function pts(list) { return list.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }

  function build(svg, modeName) {
    var M = MODES[modeName], R = rng(11);
    while (svg.lastChild && svg.lastChild.nodeName !== "title") svg.removeChild(svg.lastChild);
    svg.setAttribute("viewBox", "0 0 " + M.w + " " + M.h);

    // roof plane edges at height y
    function xl(y) { var t = (y - M.ridgeY) / (M.eaveY - M.ridgeY); return M.rL + (M.eL - M.rL) * t; }
    function xr(y) { var t = (y - M.ridgeY) / (M.eaveY - M.ridgeY); return M.rR + (M.eR - M.rR) * t; }

    var defs = el("defs", {}, svg);
    var sky = el("linearGradient", { id: "rSky", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: "0", "stop-color": C.sky1 }, sky);
    el("stop", { offset: "1", "stop-color": C.sky2 }, sky);
    var roofShape = [[M.rL, M.ridgeY], [M.rR, M.ridgeY], [M.eR, M.eaveY], [M.eL, M.eaveY]];
    var clip = el("clipPath", { id: "rRoofClip" }, defs);
    el("polygon", { points: pts(roofShape) }, clip);

    var g = {};
    ["sky", "mtn", "ground", "house", "deck", "felt", "fresh", "old", "fascia", "marks", "drips", "plants"].forEach(function (k) {
      g[k] = el("g", { "data-layer": k }, svg);
    });
    ["deck", "felt", "fresh", "old"].forEach(function (k) { g[k].setAttribute("clip-path", "url(#rRoofClip)"); });

    /* ---------- Sky, sun, mountains, ground ---------- */
    var hor = M.groundY - (modeName === "landscape" ? 230 : 300);
    el("rect", { x: 0, y: 0, width: M.w, height: M.groundY, fill: "url(#rSky)" }, g.sky);
    var sun = el("circle", { cx: modeName === "landscape" ? M.w * 0.9 : M.w * 0.84, cy: modeName === "landscape" ? 150 : hor - 150,
      r: modeName === "landscape" ? 44 : 34, fill: C.sun }, g.sky);
    var k = modeName === "landscape" ? 1 : 0.8;
    function ridge(list, color) {
      var p = [[0, M.groundY]];
      list.forEach(function (q) { p.push([q[0] * M.w, hor - q[1] * k]); });
      p.push([M.w, M.groundY]);
      el("polygon", { points: pts(p), fill: color }, g.mtn);
    }
    ridge([[0, 60], [0.1, 110], [0.22, 70], [0.34, 140], [0.46, 96], [0.58, 168], [0.7, 120], [0.82, 150], [1, 90]], C.mtFar);
    ridge([[0.05, 0], [0.18, 70], [0.27, 50], [0.4, 160], [0.47, 220], [0.55, 150], [0.63, 175], [0.74, 80], [0.86, 0]], C.mtNear);
    el("polygon", { points: pts([[0.47 * M.w, hor - 220 * k], [0.4 * M.w, hor - 160 * k], [0.43 * M.w, hor - 120 * k], [0.5 * M.w, hor - 170 * k]]), fill: C.mtLight }, g.mtn);
    el("rect", { x: 0, y: hor, width: M.w, height: M.groundY - hor, fill: "#E3D6BA" }, g.mtn);
    el("rect", { x: 0, y: M.groundY, width: M.w, height: M.h - M.groundY, fill: C.ground }, g.ground);
    for (var i = 0; i < 70; i++) {
      el("ellipse", { cx: (R() * M.w).toFixed(1), cy: (M.groundY + 8 + R() * (M.h - M.groundY - 12)).toFixed(1),
        rx: (2 + R() * 4).toFixed(1), ry: (1.5 + R() * 2.5).toFixed(1), fill: R() > 0.5 ? C.gravel : "#BCA982" }, g.ground);
    }

    /* ---------- House ---------- */
    var wallH = M.groundY - M.eaveY;
    el("rect", { x: M.wallL, y: M.eaveY, width: M.wallR - M.wallL, height: wallH, fill: C.wall }, g.house);
    el("rect", { x: M.wallL, y: M.eaveY, width: M.wallR - M.wallL, height: 18, fill: C.wallShade }, g.house);   // eave shadow
    el("rect", { x: M.wallL - 4, y: M.groundY - 10, width: M.wallR - M.wallL + 8, height: 10, fill: C.trim }, g.house);
    var span = M.wallR - M.wallL;
    function windowAt(cx, w, h) {
      var x = cx - w / 2, y = M.eaveY + wallH * 0.3;
      el("rect", { x: x, y: y, width: w, height: h, fill: C.glass, stroke: C.charcoal, "stroke-width": 5 }, g.house);
      el("line", { x1: cx, y1: y, x2: cx, y2: y + h, stroke: C.charcoal, "stroke-width": 4 }, g.house);
      el("line", { x1: x, y1: y + h / 2, x2: x + w, y2: y + h / 2, stroke: C.charcoal, "stroke-width": 4 }, g.house);
    }
    windowAt(M.wallL + span * 0.2, span * 0.15, wallH * 0.38);
    windowAt(M.wallL + span * 0.78, span * 0.15, wallH * 0.38);
    el("rect", { x: M.wallL + span * 0.45, y: M.groundY - wallH * 0.62, width: span * 0.11, height: wallH * 0.62 - 10, fill: C.door }, g.house);
    var stain = el("path", { d: "M" + (M.wallL + span * 0.3) + "," + (M.eaveY + 16) + " q12,30 4,62 q-14,10 -24,-4 q-6,-30 6,-58 z", fill: C.stain, opacity: 0.45 }, g.house);

    /* ---------- Roof deck (shows once the old roof is off) ---------- */
    el("polygon", { points: pts(roofShape), fill: C.deck }, g.deck);
    for (var sx = M.eL; sx < M.eR; sx += M.tab * 4) el("line", { x1: sx, y1: M.ridgeY, x2: sx, y2: M.eaveY, stroke: C.deckSeam, "stroke-width": 2 }, g.deck);
    for (var sy = M.eaveY - M.row * 5; sy > M.ridgeY; sy -= M.row * 5) el("line", { x1: 0, y1: sy, x2: M.w, y2: sy, stroke: C.deckSeam, "stroke-width": 2 }, g.deck);

    /* ---------- Courses (rows) ---------- */
    var rows = [];
    for (var y1 = M.eaveY; y1 > M.ridgeY + 0.5; y1 -= M.row) rows.push({ y0: Math.max(M.ridgeY, y1 - M.row), y1: y1 });

    // underlayment: one strip per course, rolled out left to right, bottom course first
    // (width is animated directly rather than scaled, so strips never drift sideways)
    var feltRects = [], feltLaps = [];
    rows.forEach(function (r) {
      var x0 = xl(r.y1) - 4, x1 = xr(r.y1) + 4;
      var rect = el("rect", { x: x0, y: r.y0 - 3, width: 0, height: r.y1 - r.y0 + 3, fill: C.felt }, g.felt);
      var lap = el("line", { x1: x0, y1: r.y0 - 3, x2: x0, y2: r.y0 - 3, stroke: C.feltLap, "stroke-width": 1.5 }, g.felt);
      rect._w = x1 - x0; lap._x2 = x1;
      feltRects.push(rect); feltLaps.push(lap);
    });

    function tabsFor(r, rowIndex, palette, parent, skip) {
      var grp = el("g", {}, parent), list = [];
      var x0 = xl(r.y1) - M.tab, x1 = xr(r.y1) + M.tab;
      for (var x = x0 - (rowIndex % 2 ? M.tab / 2 : 0); x < x1; x += M.tab) {
        if (skip && skip(x, r)) continue;
        list.push(el("rect", { x: (x + 1).toFixed(1), y: r.y0.toFixed(1), width: M.tab - 2, height: r.y1 - r.y0 - 1,
          fill: palette[Math.floor(R() * palette.length)] }, grp));
      }
      el("line", { x1: x0, y1: r.y1 - 0.5, x2: x1, y2: r.y1 - 0.5, stroke: C.tabLine, "stroke-width": 1.4, opacity: 0.6 }, grp);
      return { grp: grp, tabs: list };
    }

    // new shingles, laid course by course from the eave up
    var freshRows = rows.map(function (r, idx) { return tabsFor(r, idx, C.newTabs, g.fresh).grp; });
    var ridgeCap = el("rect", { x: M.rL - 6, y: M.ridgeY - 7, width: M.rR - M.rL + 12, height: 10, rx: 3, fill: C.ridge, opacity: 0 }, svg);
    svg.insertBefore(ridgeCap, g.fascia);

    // the old, worn roof: faded tabs, a mismatched patch, missing tabs where it leaks
    var holeX = M.eL + (M.eR - M.eL) * 0.3, holeRow = 2;
    var patchX = M.eL + (M.eR - M.eL) * 0.62;
    var oldTabs = [], oldLines = [];
    rows.forEach(function (r, idx) {
      var res = tabsFor(r, idx, C.oldTabs, g.old, function (x) {
        return (idx >= holeRow && idx <= holeRow + 2 && Math.abs(x - holeX) < M.tab * (idx === holeRow + 1 ? 1.6 : 0.9)) ||
          (idx === rows.length - 3 && Math.abs(x - (M.rL + 40)) < M.tab * 0.6);
      });
      res.tabs.forEach(function (t) {
        var x = parseFloat(t.getAttribute("x"));
        if (idx >= 5 && idx <= 7 && x > patchX && x < patchX + M.tab * 4) t.setAttribute("fill", C.patch[idx % 2]);
        if (R() < 0.04) t.setAttribute("transform", "rotate(" + (R() > 0.5 ? 6 : -6) + " " + x + " " + r.y1 + ")");
      });
      oldTabs = oldTabs.concat(res.tabs);
      oldLines.push(res.grp.lastChild);
    });

    /* ---------- Fascia ---------- */
    var fasciaH = modeName === "landscape" ? 14 : 13;
    var oldFascia = el("g", {}, g.fascia);
    el("rect", { x: M.eL, y: M.eaveY, width: M.eR - M.eL, height: fasciaH, fill: C.fasciaOld }, oldFascia);
    for (i = 0; i < 6; i++) el("rect", { x: (M.eL + R() * (M.eR - M.eL - 40)).toFixed(1), y: M.eaveY + 3, width: (14 + R() * 26).toFixed(1), height: fasciaH - 6, fill: C.fasciaRot, opacity: 0.7 }, oldFascia);
    var sagX = M.eR - 70;
    el("rect", { x: sagX, y: M.eaveY, width: 70, height: fasciaH, fill: C.fasciaOld, transform: "rotate(9 " + sagX + " " + M.eaveY + ")" }, oldFascia);
    var newFascia = [
      el("rect", { x: M.eL, y: M.eaveY, width: 0, height: fasciaH, fill: C.fasciaNew }, g.fascia),
      el("rect", { x: M.eL - 3, y: M.eaveY - 3, width: 0, height: 4, fill: C.dripEdge }, g.fascia)
    ];
    newFascia[0]._w = M.eR - M.eL; newFascia[1]._w = M.eR - M.eL + 6;

    /* ---------- What's wrong: rings and a drip ---------- */
    var marks = [];
    [[holeX, rows[holeRow + 1].y0 + 6, 34], [sagX + 40, M.eaveY + 12, 30], [M.wallL + span * 0.3 - 4, M.eaveY + 48, 30]].forEach(function (m) {
      marks.push(el("circle", { cx: m[0].toFixed(1), cy: m[1].toFixed(1), r: m[2], fill: "none", stroke: C.ring, "stroke-width": 4, opacity: 0 }, g.marks));
    });
    var drops = [];
    for (i = 0; i < 3; i++) {
      var dx = holeX + 6 + i * 3, dy = M.eaveY + fasciaH + 2;
      drops.push(el("path", { d: "M" + dx + "," + dy + " q-5,9 0,12 q5,-3 0,-12 z", fill: C.drop, opacity: 0 }, g.drips));
    }
    if (window._dgbDrips) window._dgbDrips.kill();   // a rebuild (phone rotated) replaces the old loop
    var dripLoop = null;
    if (!reduceMotion && window.gsap) {
      dripLoop = gsap.timeline({ repeat: -1 });
      drops.forEach(function (d, n) {
        window._dgbDrips = dripLoop;
        dripLoop.fromTo(d, { y: 0, opacity: 0.95 }, { y: modeName === "landscape" ? 60 : 70, opacity: 0, duration: 1.1, ease: "power1.in" }, n * 0.45);
      });
    }

    /* ---------- A little landscaping in front ---------- */
    function agave(cx, size) {
      var grp = el("g", {}, g.plants), L = size, w = size * 0.09;
      for (var a = -78; a <= 78; a += 19.5) {
        var rad = a * Math.PI / 180, len = L * (1 - Math.abs(a) / 260);
        el("polygon", { points: pts([[cx - w, M.groundY], [cx + Math.sin(rad) * len, M.groundY - Math.cos(rad) * len], [cx + w, M.groundY]]), fill: Math.abs(a) % 39 < 1 ? C.agaveDark : C.agave }, grp);
      }
    }
    if (modeName === "landscape") { agave(M.wallL + 30, 46); agave(M.wallR - 20, 38); }
    else { agave(M.wallL + 40, 40); agave(M.wallR - 40, 34); }

    /* ---------- Timeline ---------- */
    var tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    tl.addLabel("s1", 0)
      .fromTo(marks, { scale: 0.4, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, duration: 0.18, ease: "back.out(2)", stagger: 0.12 }, 0.15);

    tl.addLabel("s2", 1)
      .to(marks, { opacity: 0, duration: 0.1 }, 1.0)
      .to(g.drips, { opacity: 0, duration: 0.08 }, 1.0)
      .to(oldTabs, {
        y: function () { return -30 - R() * 60; }, x: function () { return (R() - 0.5) * 60; },
        rotation: function () { return (R() - 0.5) * 70; }, opacity: 0, transformOrigin: "50% 50%",
        duration: 0.22, stagger: { each: 0.65 / oldTabs.length, from: "random" }
      }, 1.05)
      .to(oldLines, { opacity: 0, duration: 0.3 }, 1.4);

    // each strip rolls out from its left end, bottom course first
    tl.addLabel("s3", 2)
      .to(feltRects, { attr: { width: function (n, t) { return t._w; } }, duration: 0.12, stagger: 0.72 / feltRects.length }, 2.05)
      .to(feltLaps, { attr: { x2: function (n, t) { return t._x2; } }, duration: 0.12, stagger: 0.72 / feltLaps.length }, 2.05);

    tl.addLabel("s4", 3)
      .fromTo(freshRows, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.1, ease: "power2.out", stagger: 0.72 / freshRows.length }, 3.05)
      .to(ridgeCap, { opacity: 1, duration: 0.1 }, 3.85);

    tl.addLabel("s5", 4)
      .to(oldFascia, { opacity: 0, y: 14, duration: 0.18, ease: "power1.in" }, 4.05)
      .to(newFascia, { attr: { width: function (n, t) { return t._w; } }, duration: 0.4, ease: "power2.inOut" }, 4.25)
      .to(stain, { opacity: 0, duration: 0.3 }, 4.3);

    tl.addLabel("s6", 5)
      .to(sun, { attr: { fill: "#F7B733" }, duration: 0.6 }, 5.05)
      .to({}, { duration: 0.9 }, 5.1);

    return { tl: tl };
  }

  return { build: build };
})();
