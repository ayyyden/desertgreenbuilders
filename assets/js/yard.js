/*
  The yard illustration. Draws a dirt lot in perspective and returns a paused
  GSAP timeline that builds it, stage by stage:
    s1 clear & grade, s2 concrete, s3 pavers, s4 turf, s5 gravel, s6 finishing touches.
  World units are meters: x across (0 = center line), y up, z away from the viewer.
*/
window.DGBYard = (function () {
  var NS = "http://www.w3.org/2000/svg";

  var C = {
    sky1: "#BFDFEA", sky2: "#EDF5F0", sun: "#F5C431",
    mtFar: "#DCD2C1", mtNear: "#BDAC95", mtShade: "#A8977F", mtLight: "#CDBFA9",
    desert: "#DCCBA8", dirt: "#B8976A", dirtDark: "#957548", graded: "#CDB48A", rake: "#B89C70",
    wall: "#D3C6AD", wallCap: "#B9AA8F",
    charcoal: "#34353C", white: "#FFFFFF", door: "#4A4B52",
    wet: "#8E8F8A", concrete: "#D5D4CE", concreteEdge: "#B4B3AC", joint: "#A6A59F",
    pavers: ["#C9B79C", "#BDAC95", "#AE9C82", "#D6C8B0", "#C3AF92"], border: "#5B5C61",
    turf1: "#6E9443", turf2: "#5F8539", turfRoll: "#4A6B2C",
    dg: "#D9C8A6", rocks: ["#A89C8A", "#8E8576", "#C7BBA5", "#6F6A62", "#B5A48A", "#E3D8C4", "#9A8C78"],
    weed: "#8A8546", weed2: "#6E6A35", junk: "#7D6F5E",
    agave: "#7C9A63", agaveDark: "#55744A", cactus: "#5F8539", cactusDark: "#4A6B2C", rib: "#7FA457",
    tree: "#8FA45A", treeDark: "#6F8A45", trunk: "#6B5A45",
    stone: "#7E7C77", stoneDark: "#5E5C58", pit: "#3B3936", fire: "#F08A24", fire2: "#F5C431",
    seat: "#CDBFA6", seatTop: "#BDAC95"
  };

  var MODES = {
    landscape: { w: 1200, h: 800, cx: 860, hor: 390, f: 700, ch: 3.2 },
    portrait: { w: 600, h: 1200, cx: 300, hor: 540, f: 560, ch: 4.6 }
  };
  var ZC = 6;   // camera distance in front of z = 0

  function rng(seed) {   // mulberry32, so the scene looks the same on every load
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
  function pts(list) {
    return list.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
  }

  function build(svg, modeName) {
    var M = MODES[modeName], CH = M.ch;
    var R = rng(7);
    while (svg.lastChild && svg.lastChild.nodeName !== "title") svg.removeChild(svg.lastChild);
    svg.setAttribute("viewBox", "0 0 " + M.w + " " + M.h);

    function P(x, y, z) { var d = z + ZC; return [M.cx + M.f * x / d, M.hor + M.f * (CH - y) / d]; }
    function S(z) { return M.f / (z + ZC); }   // px per meter at depth z
    function quad(x0, x1, z0, z1, y) {
      y = y || 0;
      return [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)];
    }
    // lowest z that is still on screen
    var zVisible = M.f * CH / (M.h - M.hor) - ZC;

    var defs = el("defs", {}, svg);
    var sky = el("linearGradient", { id: "ySky", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: "0", "stop-color": C.sky1 }, sky);
    el("stop", { offset: "1", "stop-color": C.sky2 }, sky);

    var root = el("g", {}, svg);
    var g = {};
    ["sky", "mtn", "ground", "walls", "house", "lot", "cracks", "junk", "graded", "patio", "seat",
      "pit", "path", "turf", "roll", "gravelBase", "gravel", "plants", "tumble"].forEach(function (k) {
      g[k] = el("g", { "data-layer": k }, root);
    });

    /* ---------- Sky, sun, mountains ---------- */
    el("rect", { x: 0, y: 0, width: M.w, height: M.hor + 2, fill: "url(#ySky)" }, g.sky);
    var sunPos = modeName === "landscape" ? [M.w * 0.9, M.hor * 0.42] : [M.w * 0.86, M.hor - 150];
    var sun = el("circle", { cx: sunPos[0], cy: sunPos[1], r: modeName === "landscape" ? 44 : 34, fill: C.sun }, g.sky);

    var k = M.f / 700 * (modeName === "portrait" ? 0.85 : 1);
    function ridge(list, color) {
      var p = [[0, M.hor + 2]];
      list.forEach(function (q) { p.push([q[0] * M.w, M.hor - q[1] * k]); });
      p.push([M.w, M.hor + 2]);
      return el("polygon", { points: pts(p), fill: color }, g.mtn);
    }
    ridge([[0, 70], [0.07, 105], [0.16, 72], [0.27, 140], [0.36, 98], [0.47, 175], [0.58, 128],
      [0.67, 168], [0.78, 112], [0.88, 150], [1, 86]], C.mtFar);
    ridge([[0.12, 0], [0.24, 62], [0.31, 48], [0.43, 150], [0.5, 228], [0.57, 170], [0.62, 186],
      [0.7, 96], [0.76, 112], [0.86, 30], [0.92, 0]], C.mtNear);
    // sunlit facets, the way the logo shades its mountains
    [[[0.5, 228], [0.47, 175], [0.455, 150], [0.49, 120], [0.53, 160]],
      [[0.62, 186], [0.6, 150], [0.635, 118], [0.66, 140]],
      [[0.24, 62], [0.22, 40], [0.26, 30]]].forEach(function (f) {
      el("polygon", { points: pts(f.map(function (q) { return [q[0] * M.w, M.hor - q[1] * k]; })), fill: C.mtLight }, g.mtn);
    });
    [[[0.5, 228], [0.57, 170], [0.55, 120], [0.53, 160]],
      [[0.62, 186], [0.7, 96], [0.66, 140]]].forEach(function (f) {
      el("polygon", { points: pts(f.map(function (q) { return [q[0] * M.w, M.hor - q[1] * k]; })), fill: C.mtShade, opacity: 0.55 }, g.mtn);
    });

    el("rect", { x: 0, y: M.hor, width: M.w, height: M.h - M.hor, fill: C.desert }, g.ground);

    /* ---------- Block walls and house ---------- */
    var LOT = { x0: -10.5, x1: 10.5, z0: -4.5, z1: 15.8 }, WALL_H = 1.4;
    el("polygon", { points: pts([P(LOT.x0, 0, LOT.z1), P(LOT.x1, 0, LOT.z1), P(LOT.x1, WALL_H, LOT.z1), P(LOT.x0, WALL_H, LOT.z1)]), fill: C.wall }, g.walls);
    el("line", lineAttrs(P(LOT.x0, WALL_H, LOT.z1), P(LOT.x1, WALL_H, LOT.z1), C.wallCap, 0.14 * S(LOT.z1)), g.walls);
    [LOT.x0, LOT.x1].forEach(function (x) {
      el("polygon", { points: pts([P(x, 0, LOT.z0), P(x, 0, LOT.z1), P(x, WALL_H, LOT.z1), P(x, WALL_H, LOT.z0)]), fill: x < 0 ? C.wall : "#C9BBA1" }, g.walls);
      el("line", lineAttrs(P(x, WALL_H, LOT.z0), P(x, WALL_H, LOT.z1), C.wallCap, 0.14 * S(LOT.z1)), g.walls);
    });

    var HZ = 15, hs = S(HZ), stroke = 0.16 * hs;
    function H(x, y) { return P(x, y, HZ); }
    function hRect(x0, y0, x1, y1, fill, sw, parent) {
      var a = H(x0, y1), b = H(x1, y0);
      return el("rect", { x: a[0], y: a[1], width: b[0] - a[0], height: b[1] - a[1], fill: fill,
        stroke: sw ? C.charcoal : "none", "stroke-width": sw || 0 }, parent || g.house);
    }
    hRect(-4.7, 0, 3.4, 3.0, C.white, stroke);
    // roof: a heavy charcoal chevron like the logo
    var roof = [H(-5.5, 2.55), H(-0.65, 5.35), H(4.2, 2.55), H(3.6, 2.55), H(-0.65, 4.75), H(-4.9, 2.55)];
    el("polygon", { points: pts(roof), fill: C.charcoal }, g.house);
    hRect(-4.95, 1.75, -4.55, 2.6, C.charcoal, 0);
    hRect(-1.25, 2.85, -0.05, 4.05, C.charcoal, 0);
    [[-1.15, 3.5, -0.7, 3.95], [-0.6, 3.5, -0.15, 3.95], [-1.15, 2.95, -0.7, 3.4], [-0.6, 2.95, -0.15, 3.4]]
      .forEach(function (r) { hRect(r[0], r[1], r[2], r[3], C.white, 0); });
    hRect(-3.6, 1.0, -2.2, 2.2, "#DDE9EE", stroke * 0.7);
    hRect(0.9, 0, 2.5, 2.25, C.door, 0);
    // pergola on the right, part of the existing house
    hRect(3.4, 2.45, 8.3, 2.75, C.charcoal, 0);
    hRect(7.75, 0, 8.05, 2.5, C.charcoal, 0);
    hRect(5.35, 0, 5.6, 2.5, C.charcoal, 0);
    for (var rx = 3.7; rx < 8.3; rx += 0.55) hRect(rx, 2.75, rx + 0.12, 3.05, C.charcoal, 0);

    /* ---------- The lot, before ---------- */
    el("polygon", { points: pts(quad(LOT.x0, LOT.x1, LOT.z0, LOT.z1 - 0.05)), fill: C.dirt }, g.lot);
    for (var i = 0; i < 16; i++) {
      var cx = -9.5 + R() * 19, cz = Math.max(zVisible, -1) + R() * (14 - Math.max(zVisible, -1));
      var p = [P(cx, 0, cz)];
      for (var j = 0; j < 3; j++) { cx += (R() - 0.5) * 1.6; cz += (R() - 0.5) * 1.0; p.push(P(cx, 0, cz)); }
      el("polyline", { points: pts(p), fill: "none", stroke: C.dirtDark, "stroke-width": Math.max(1, 0.05 * S(cz)), "stroke-linecap": "round", "stroke-linejoin": "round" }, g.cracks);
    }
    var weeds = [];
    for (i = 0; i < 26; i++) {
      var wx = -9.6 + R() * 19.2, wz = Math.max(zVisible, -0.5) + R() * (13.5 - Math.max(zVisible, -0.5));
      if (Math.abs(wx) < 1.2 && wz < 3) continue;
      var b = P(wx, 0, wz), s = S(wz) * (0.35 + R() * 0.3);
      var tuft = el("g", {}, g.junk), d = "";
      for (j = -2; j <= 2; j++) {
        var a = j * 0.38 + (R() - 0.5) * 0.2;
        d += "M" + b[0].toFixed(1) + "," + b[1].toFixed(1) + " q" + (Math.sin(a) * s * 0.3).toFixed(1) + "," + (-s * 0.5).toFixed(1) + " " + (Math.sin(a) * s).toFixed(1) + "," + (-Math.cos(a) * s * (0.7 + R() * 0.4)).toFixed(1);
      }
      el("path", { d: d, fill: "none", stroke: R() > 0.5 ? C.weed : C.weed2, "stroke-width": Math.max(1, s * 0.09), "stroke-linecap": "round" }, tuft);
      weeds.push(tuft);
    }
    for (i = 0; i < 9; i++) {
      var jx = -9 + R() * 18, jz = Math.max(zVisible, 0) + R() * 11, jp = P(jx, 0, jz), js = S(jz);
      weeds.push(el("ellipse", { cx: jp[0], cy: jp[1] - js * 0.08, rx: js * (0.18 + R() * 0.18), ry: js * 0.11, fill: C.junk }, g.junk));
    }
    var twZ = Math.max(zVisible + 1.5, 2.5), twP = P(-3.2, 0, twZ), twS = S(twZ) * 0.65;
    var tumble = el("g", { transform: "translate(" + twP[0].toFixed(1) + "," + (twP[1] - twS).toFixed(1) + ")" }, g.tumble);
    var tumbleSpin = el("g", {}, tumble);
    for (i = 0; i < 7; i++) {
      el("ellipse", { cx: 0, cy: 0, rx: twS * (0.75 + R() * 0.3), ry: twS * (0.45 + R() * 0.4), fill: "none",
        stroke: C.dirtDark, "stroke-width": Math.max(1, twS * 0.07), transform: "rotate(" + (i * 26) + ")" }, tumbleSpin);
    }

    /* ---------- Clear & grade ---------- */
    var graded = el("polygon", { points: pts(quad(LOT.x0, LOT.x1, LOT.z0, LOT.z1 - 0.05)), fill: C.graded, opacity: 0 }, g.graded);
    var rakes = el("g", { opacity: 0 }, g.graded);
    for (var rz = Math.max(zVisible, -1); rz < 15; rz += 0.9) {
      el("line", lineAttrs(P(LOT.x0, 0, rz), P(LOT.x1, 0, rz), C.rake, Math.max(0.6, 0.03 * S(rz))), rakes);
    }

    /* ---------- Concrete patio ---------- */
    var PAT = { x0: -6.2, x1: 7.2, z0: 10.5, z1: 14.8 };
    var patioClip = el("clipPath", { id: "yPatioClip", clipPathUnits: "userSpaceOnUse" }, defs);
    var pL = P(PAT.x0, 0, PAT.z0)[0], pR = P(PAT.x1, 0, PAT.z0)[0];
    var patioWipe = el("rect", { x: pL - 2, y: M.hor, width: 0, height: M.h - M.hor }, patioClip);
    var patio = el("g", { "clip-path": "url(#yPatioClip)" }, g.patio);
    el("polygon", { points: pts([P(PAT.x0, 0, PAT.z0), P(PAT.x1, 0, PAT.z0), P(PAT.x1, 0.12, PAT.z0), P(PAT.x0, 0.12, PAT.z0)]), fill: C.concreteEdge }, patio);
    var slab = el("polygon", { points: pts(quad(PAT.x0, PAT.x1, PAT.z0, PAT.z1, 0.12)), fill: C.wet }, patio);
    var joints = el("g", { opacity: 0 }, patio);
    el("line", lineAttrs(P(PAT.x0, 0.12, 12.65), P(PAT.x1, 0.12, 12.65), C.joint, 0.04 * S(12.6)), joints);
    [-1.6, 2.8].forEach(function (x) { el("line", lineAttrs(P(x, 0.12, PAT.z0), P(x, 0.12, PAT.z1), C.joint, 0.04 * S(12.6)), joints); });

    /* ---------- Seat wall and fire pit (finishing touches) ---------- */
    var seat = el("g", { opacity: 0 }, g.seat);
    var SW = { x0: -6.0, x1: -2.7, z: 10.62, h: 0.5, d: 0.4 };
    el("polygon", { points: pts([P(SW.x0, SW.h, SW.z), P(SW.x1, SW.h, SW.z), P(SW.x1, SW.h, SW.z + SW.d), P(SW.x0, SW.h, SW.z + SW.d)]), fill: C.seatTop }, seat);
    el("polygon", { points: pts([P(SW.x0, 0, SW.z), P(SW.x1, 0, SW.z), P(SW.x1, SW.h, SW.z), P(SW.x0, SW.h, SW.z)]), fill: C.seat }, seat);

    // Fire pit: a raised stone ring on the patio, flames rising out of the bowl, a warm glow underneath.
    var pitZ = 12.5, pc = P(4.4, 0.12, pitZ), ps = S(pitZ);
    var PR = 0.95 * ps;                                              // ring radius on screen
    var RY = (P(0, 0, pitZ - 0.95)[1] - P(0, 0, pitZ + 0.95)[1]) / 2;  // same radius, foreshortened
    var rimH = 0.42 * ps, top = [pc[0], pc[1] - rimH], inR = 0.7;
    function ring(cx, cy, rx, ry) { return "M" + (cx - rx).toFixed(1) + "," + cy.toFixed(1) + " A" + rx.toFixed(1) + "," + ry.toFixed(1) + " 0 1 0 " + (cx + rx).toFixed(1) + "," + cy.toFixed(1) + " A" + rx.toFixed(1) + "," + ry.toFixed(1) + " 0 1 0 " + (cx - rx).toFixed(1) + "," + cy.toFixed(1) + " Z"; }
    var pit = el("g", { opacity: 0 }, g.pit);
    var glow = el("ellipse", { cx: pc[0], cy: pc[1], rx: PR * 1.9, ry: RY * 1.9, fill: C.fire2, opacity: 0 }, pit);
    el("path", { d: ring(pc[0], pc[1], PR, RY), fill: C.stoneDark }, pit);                              // base
    el("rect", { x: pc[0] - PR, y: top[1], width: 2 * PR, height: rimH, fill: C.stoneDark }, pit);       // side wall
    for (var sb = -0.75; sb <= 0.76; sb += 0.375) {                                                    // stone joints
      var jx = pc[0] + sb * PR, jy = pc[1] + RY * Math.sqrt(1 - sb * sb);
      el("line", { x1: jx.toFixed(1), y1: (jy - rimH).toFixed(1), x2: jx.toFixed(1), y2: jy.toFixed(1), stroke: "#4E4C48", "stroke-width": Math.max(0.8, 0.04 * ps) }, pit);
    }
    el("path", { d: ring(top[0], top[1], PR, RY), fill: C.stone }, pit);                               // rim top
    el("path", { d: ring(top[0], top[1], PR * inR, RY * inR), fill: C.pit }, pit);                     // bowl
    var flames = el("g", { opacity: 0 }, pit);
    var fireBase = top[1] + RY * inR * 0.35;
    [[-0.3, 0.8, 0.2, C.fire], [0.3, 0.72, 0.2, C.fire], [0, 1.35, 0.34, C.fire], [-0.05, 0.85, 0.2, "#F7A531"], [0.06, 0.55, 0.13, C.fire2]].forEach(function (f) {
      var fx = top[0] + f[0] * PR, fh = f[1] * ps, fw = f[2] * ps, by = fireBase;
      var flame = el("path", { d: "M" + (fx - fw).toFixed(1) + "," + by.toFixed(1) +
        " C" + (fx - fw).toFixed(1) + "," + (by - fh * 0.45).toFixed(1) + " " + (fx - fw * 0.15).toFixed(1) + "," + (by - fh * 0.7).toFixed(1) + " " + fx.toFixed(1) + "," + (by - fh).toFixed(1) +
        " C" + (fx + fw * 0.15).toFixed(1) + "," + (by - fh * 0.7).toFixed(1) + " " + (fx + fw).toFixed(1) + "," + (by - fh * 0.45).toFixed(1) + " " + (fx + fw).toFixed(1) + "," + by.toFixed(1) +
        " Q" + fx.toFixed(1) + "," + (by + fw * 0.5).toFixed(1) + " " + (fx - fw).toFixed(1) + "," + by.toFixed(1) + " Z", fill: f[3] }, flames);
      flame._origin = fx.toFixed(1) + " " + by.toFixed(1);                // flicker around the flame's own base
    });
    // front lip of the rim, drawn over the bottom of the flames so they sit inside the bowl
    el("path", { d: "M" + (top[0] - PR).toFixed(1) + "," + top[1].toFixed(1) +
      " A" + PR.toFixed(1) + "," + RY.toFixed(1) + " 0 0 0 " + (top[0] + PR).toFixed(1) + "," + top[1].toFixed(1) +
      " L" + (top[0] + PR * inR).toFixed(1) + "," + top[1].toFixed(1) +
      " A" + (PR * inR).toFixed(1) + "," + (RY * inR).toFixed(1) + " 0 0 1 " + (top[0] - PR * inR).toFixed(1) + "," + top[1].toFixed(1) + " Z", fill: C.stone }, pit);

    /* ---------- Paver walkway ---------- */
    var PATH = { x0: -1.4, x1: 1.4, z0: Math.max(LOT.z0, zVisible - 0.5), z1: PAT.z0 };
    var borders = el("g", { opacity: 0 }, g.path);
    el("polygon", { points: pts(quad(-1.62, PATH.x0, PATH.z0, PATH.z1)), fill: C.border }, borders);
    el("polygon", { points: pts(quad(PATH.x1, 1.62, PATH.z0, PATH.z1)), fill: C.border }, borders);
    var pavers = [], DEPTH = 0.5, WIDTH = 0.7, GAP = 0.035, row = 0;
    for (var z = PATH.z1; z > PATH.z0; z -= DEPTH, row++) {
      var za = Math.max(PATH.z0, z - DEPTH) + GAP, zb = z - GAP;
      for (var x = PATH.x0 - (row % 2 ? WIDTH / 2 : 0); x < PATH.x1; x += WIDTH) {
        var xa = Math.max(PATH.x0, x) + GAP, xb = Math.min(PATH.x1, x + WIDTH) - GAP;
        if (xb - xa < 0.1) continue;
        pavers.push(el("polygon", { points: pts(quad(xa, xb, za, zb)), fill: C.pavers[Math.floor(R() * C.pavers.length)], opacity: 0 }, g.path));
      }
    }

    /* ---------- Artificial turf ---------- */
    var TURF = { x0: LOT.x0 + 0.02, x1: -1.62, z0: PATH.z0, z1: PAT.z0 - 0.15 };
    var turfClip = el("clipPath", { id: "yTurfClip", clipPathUnits: "userSpaceOnUse" }, defs);
    var turfClipPoly = el("polygon", { points: "" }, turfClip);
    var turf = el("g", { "clip-path": "url(#yTurfClip)" }, g.turf);
    var bands = 8, bw = (TURF.x1 - TURF.x0) / bands;
    for (i = 0; i < bands; i++) {
      el("polygon", { points: pts(quad(TURF.x0 + i * bw, TURF.x0 + (i + 1) * bw + 0.02, TURF.z0, TURF.z1)), fill: i % 2 ? C.turf2 : C.turf1 }, turf);
    }
    var roll = el("line", { stroke: C.turfRoll, "stroke-linecap": "round", opacity: 0 }, g.roll);
    var turfState = { z: TURF.z1 };
    function drawTurf() {
      var zf = turfState.z;
      turfClipPoly.setAttribute("points", pts(quad(TURF.x0 - 0.3, TURF.x1, zf, TURF.z1 + 0.05)));
      var a = P(TURF.x0 - 0.5, 0.2, zf), b = P(TURF.x1 + 0.05, 0.2, zf);
      var left = (zf - TURF.z0) / (TURF.z1 - TURF.z0);
      roll.setAttribute("x1", a[0]); roll.setAttribute("y1", a[1]);
      roll.setAttribute("x2", b[0]); roll.setAttribute("y2", b[1]);
      roll.setAttribute("stroke-width", (0.42 * S(zf) * (0.35 + 0.65 * left)).toFixed(1));
    }
    drawTurf();

    /* ---------- Gravel ---------- */
    var GRAV = { x0: 1.62, x1: LOT.x1 - 0.02, z0: PATH.z0, z1: PAT.z0 - 0.15 };
    var gravelBase = el("polygon", { points: pts(quad(GRAV.x0, GRAV.x1, GRAV.z0, GRAV.z1)), fill: C.dg, opacity: 0 }, g.gravelBase);
    var dots = [], yTop = P(0, 0, GRAV.z1)[1], N = modeName === "landscape" ? 360 : 260;
    for (i = 0; i < N * 2 && dots.length < N; i++) {
      var sy = yTop + R() * (M.h - yTop);
      var dz = M.f * CH / (sy - M.hor) - ZC;
      var dx = GRAV.x0 + 0.08 + R() * (GRAV.x1 - GRAV.x0 - 0.16);
      var dp = P(dx, 0, dz);
      if (dp[0] > M.w + 8 || dz < GRAV.z0) continue;
      var r = (0.05 + R() * 0.07) * S(dz);
      var dot = el("ellipse", { cx: dp[0].toFixed(1), cy: dp[1].toFixed(1), rx: 0, ry: 0, fill: C.rocks[Math.floor(R() * C.rocks.length)] }, g.gravel);
      dot._r = r;
      dots.push(dot);
    }

    /* ---------- Plants ---------- */
    var plants = [];
    function plantAt(x, z, draw) {
      var base = P(x, 0, z), s = S(z);
      var grp = el("g", { "data-z": z }, g.plants);
      draw(grp, base[0], base[1], s);
      grp._base = base;
      plants.push(grp);
    }
    function agave(size) {
      return function (grp, bx, by, s) {
        var L = size * s, w = 0.09 * s * size;
        for (var a = -78; a <= 78; a += 19.5) {
          var rad = a * Math.PI / 180, len = L * (1 - Math.abs(a) / 260);
          el("polygon", { points: pts([[bx - w, by], [bx + Math.sin(rad) * len, by - Math.cos(rad) * len], [bx + w, by]]),
            fill: Math.abs(a) % 39 < 1 ? C.agaveDark : C.agave }, grp);
        }
      };
    }
    function barrel(size) {
      return function (grp, bx, by, s) {
        var rx = 0.42 * size * s, ry = 0.5 * size * s;
        el("ellipse", { cx: bx, cy: by - ry, rx: rx, ry: ry, fill: C.cactus }, grp);
        [-0.5, 0, 0.5].forEach(function (o) {
          el("path", { d: "M" + (bx + o * rx).toFixed(1) + "," + (by - 2 * ry * 0.96).toFixed(1) + " Q" + (bx + o * rx * 1.5).toFixed(1) + "," + (by - ry).toFixed(1) + " " + (bx + o * rx).toFixed(1) + "," + by.toFixed(1),
            fill: "none", stroke: C.cactusDark, "stroke-width": Math.max(0.8, 0.03 * s) }, grp);
        });
        el("circle", { cx: bx, cy: by - 2 * ry + 0.05 * s, r: 0.07 * s, fill: C.sun }, grp);
      };
    }
    function saguaro(h) {
      return function (grp, bx, by, s) {
        var w = 0.42 * s, top = by - h * s;
        var st = { fill: "none", stroke: C.cactus, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" };
        el("path", Object.assign({ d: "M" + bx + "," + (by - w / 2) + " V" + (top + w / 2) }, st), grp);
        el("path", Object.assign({ d: "M" + bx + "," + (by - 1.5 * s) + " h" + (-0.75 * s) + " v" + (-1.3 * s) }, st, { "stroke-width": w * 0.8 }), grp);
        el("path", Object.assign({ d: "M" + bx + "," + (by - 2.1 * s) + " h" + (0.7 * s) + " v" + (-1.1 * s) }, st, { "stroke-width": w * 0.8 }), grp);
        el("path", { d: "M" + bx + "," + (by - w) + " V" + (top + w), fill: "none", stroke: C.rib, "stroke-width": Math.max(0.8, 0.05 * s), "stroke-linecap": "round" }, grp);
      };
    }
    function tree(h) {
      return function (grp, bx, by, s) {
        el("path", { d: "M" + bx + "," + by + " v" + (-h * 0.55 * s) + " l" + (-0.5 * s) + "," + (-0.6 * s) + " M" + bx + "," + (by - h * 0.5 * s) + " l" + (0.6 * s) + "," + (-0.7 * s),
          fill: "none", stroke: C.trunk, "stroke-width": 0.16 * s, "stroke-linecap": "round" }, grp);
        [[-0.9, 0.8, 1.0], [0.8, 0.85, 1.05], [0, 1.05, 1.2], [-0.3, 0.55, 0.8], [0.5, 0.5, 0.85]].forEach(function (c, n) {
          el("circle", { cx: bx + c[0] * s, cy: by - h * 0.55 * s - c[1] * s, r: c[2] * s, fill: n % 2 ? C.treeDark : C.tree }, grp);
        });
      };
    }
    var plantList = [
      [9.0, 9.5, saguaro(4.2)], modeName === "landscape" ? [-6.2, 9.6, tree(2.8)] : [-8.6, 9.3, tree(3.0)], [6.3, 8.6, barrel(0.9)], [9.3, 5.8, barrel(1.0)],
      [4.5, 6.4, agave(1.05)], [7.7, 2.6, agave(1.25)], [3.0, 1.6, barrel(0.85)]
    ];
    if (modeName === "portrait") plantList.push([2.6, -1.6, agave(0.8)]);
    plantList.sort(function (a, b) { return b[1] - a[1]; })
      .forEach(function (p) { plantAt(p[0], p[1], p[2]); });

    /* ---------- Timeline ---------- */
    var tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    tl.addLabel("s1", 0)
      .to(tumble, { x: -M.w * 0.75, duration: 0.8, ease: "power1.in" }, 0.05)
      .to(tumbleSpin, { rotation: -720, svgOrigin: "0 0", duration: 0.8, ease: "power1.in" }, 0.05)
      .to(weeds, { scale: 0, opacity: 0, transformOrigin: "50% 100%", duration: 0.25, stagger: { each: 0.4 / weeds.length, from: "random" } }, 0.1)
      .to(g.cracks, { opacity: 0, duration: 0.35 }, 0.35)
      .to(graded, { opacity: 1, duration: 0.45 }, 0.4)
      .to(rakes, { opacity: 0.45, duration: 0.3 }, 0.55);

    tl.addLabel("s2", 1)
      .to(patioWipe, { attr: { width: pR - pL + 4 }, duration: 0.55, ease: "power1.inOut" }, 1.05)
      .to(slab, { attr: { fill: C.concrete }, duration: 0.3 }, 1.5)
      .to(joints, { opacity: 1, duration: 0.15 }, 1.72);

    tl.addLabel("s3", 2)
      .to(borders, { opacity: 1, duration: 0.15 }, 2.02)
      .fromTo(pavers, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.12, stagger: { each: 0.72 / pavers.length } }, 2.05);

    tl.addLabel("s4", 3)
      .set(roll, { opacity: 1 }, 3.04)
      .to(turfState, { z: TURF.z0 - 0.6, duration: 0.82, ease: "power1.in", onUpdate: drawTurf }, 3.05)
      .set(roll, { opacity: 0 }, 3.88);

    tl.addLabel("s5", 4)
      .to(gravelBase, { opacity: 1, duration: 0.25 }, 4.02)
      .to(dots, { attr: { rx: function (n, t) { return t._r.toFixed(1); }, ry: function (n, t) { return (t._r * 0.75).toFixed(1); } },
        duration: 0.1, stagger: { each: 0.7 / dots.length, from: "random" } }, 4.1);

    tl.addLabel("s6", 5)
      .fromTo(seat, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, 5.05)
      .fromTo(pit, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, 5.2)
      .fromTo(plants, { scale: 0, transformOrigin: "50% 100%" }, { scale: 1, duration: 0.25, ease: "back.out(1.8)", stagger: 0.07 }, 5.3)
      .to(flames, { opacity: 1, duration: 0.15 }, 5.75)
      .to(glow, { opacity: 0.28, duration: 0.25 }, 5.75)
      .to(sun, { attr: { fill: "#F7B733" }, duration: 0.6 }, 5.3);

    tl.addLabel("s7", 6).to({}, { duration: 1 }, 6);

    return {
      tl: tl,
      flicker: function () {
        var tw = Array.prototype.map.call(flames.children, function (f, n) {
          return gsap.fromTo(f, { scaleY: 1, scaleX: 1 }, { scaleY: 0.78 + (n % 3) * 0.05, scaleX: 1.06, svgOrigin: f._origin,
            duration: 0.22 + (n % 3) * 0.07, ease: "sine.inOut", repeat: -1, yoyo: true, delay: n * 0.06 });
        });
        tw.push(gsap.to(glow, { opacity: 0.18, duration: 0.5, ease: "sine.inOut", repeat: -1, yoyo: true }));
        // one handle for main.js: kill() stops every flame and puts them back at full size
        return { kill: function () { tw.forEach(function (t) { t.kill(); }); gsap.set(flames.children, { scaleX: 1, scaleY: 1 }); } };
      }
    };
  }

  function lineAttrs(a, b, color, width) {
    return { x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1),
      stroke: color, "stroke-width": Math.max(0.6, width).toFixed(2), "stroke-linecap": "round" };
  }

  return { build: build };
})();
