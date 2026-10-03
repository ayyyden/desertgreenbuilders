(function () {
  var CFG = window.DGB_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  root.classList.add("js");
  if (!reduceMotion) root.classList.add("motion");

  /* ---------- Small page details ---------- */
  document.querySelectorAll("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });

  // The number links to CSLB's license lookup (their detail pages can't be linked to directly).
  function licenseLines() {
    if (!CFG.licenseNumber) return;
    var label = window.DGBi18n ? DGBi18n.t("foot.license", "CA Contractor License #") : "CA Contractor License #";
    document.querySelectorAll("[data-license-line]").forEach(function (n) {
      n.innerHTML = "";
      var a = document.createElement("a");
      a.href = "https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/CheckLicense.aspx";
      a.target = "_blank"; a.rel = "noopener";
      a.textContent = label + CFG.licenseNumber;
      n.appendChild(a);
      n.hidden = false;
    });
  }
  licenseLines();
  document.addEventListener("dgb:lang", licenseLines);

  var header = document.getElementById("siteHeader");
  function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Hide the mobile action bar while the booking form or footer is on screen.
  var bar = document.getElementById("actionBar");
  if ("IntersectionObserver" in window && bar) {
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); });
      bar.classList.toggle("is-hidden", visible.size > 0);
    }, { rootMargin: "0px 0px -20% 0px" });
    io.observe(document.getElementById("book"));
    io.observe(document.querySelector(".site-footer"));
  }

  /* ---------- The yard build ---------- */
  var svg = document.getElementById("yard");
  var hero = document.getElementById("hero");
  var captions = Array.prototype.slice.call(document.querySelectorAll(".caption"));
  var progressBar = document.getElementById("buildProgress");
  var current = null, scene = null, trigger = null, flicker = null;

  function modeFor() { return window.innerWidth / window.innerHeight < 0.95 ? "portrait" : "landscape"; }

  function setup() {
    if (!window.gsap || !window.DGBYard) return;
    var mode = modeFor();
    if (mode === current) return;
    current = mode;

    if (trigger) { trigger.kill(); trigger = null; }
    if (scene) scene.tl.kill();
    if (flicker) { flicker.kill(); flicker = null; }

    scene = DGBYard.build(svg, mode);
    var tl = scene.tl;

    if (reduceMotion) {
      tl.progress(1);
      return;
    }

    gsap.set(captions, { autoAlpha: 0, y: 24 });
    gsap.set(hero, { autoAlpha: 1, y: 0 });

    tl.to(hero, { autoAlpha: 0, y: -40, duration: 0.3, ease: "power1.in" }, 0.02);
    captions.forEach(function (cap, i) {
      var start = i;               // caption i belongs to stage s(i+1), which starts at time i
      tl.to(cap, { autoAlpha: 1, y: 0, duration: 0.18, ease: "power2.out" }, start + 0.1);
      if (i < captions.length - 1) tl.to(cap, { autoAlpha: 0, y: -24, duration: 0.14, ease: "power1.in" }, start + 0.84);
    });

    ScrollTrigger.config({ ignoreMobileResize: true });
    trigger = ScrollTrigger.create({
      trigger: ".build",
      start: "top top",
      end: function () { return "+=" + Math.round(window.innerHeight * (mode === "portrait" ? 4.6 : 5)); },
      pin: ".build__stage",
      scrub: 0.6,
      animation: tl,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        if (progressBar) progressBar.style.transform = "scaleX(" + self.progress.toFixed(4) + ")";
        if (self.progress > 0.8 && !flicker) flicker = scene.flicker();
        else if (self.progress < 0.75 && flicker) { flicker.kill(); flicker = null; }
      }
    });
    ScrollTrigger.refresh();
  }

  function intro() {
    if (reduceMotion || !window.gsap) return;
    gsap.from(".hero__line", { yPercent: 110, autoAlpha: 0, duration: 0.8, ease: "power3.out", stagger: 0.12, delay: 0.1 });
    gsap.from([".hero__sub", ".hero__actions", ".hero__hint"], { autoAlpha: 0, y: 16, duration: 0.6, ease: "power2.out", stagger: 0.08, delay: 0.45 });
  }

  /* ---------- Services: each swatch is laid down once as it scrolls in ---------- */
  function swatches() {
    if (reduceMotion || !window.gsap) return;
    gsap.utils.toArray(".svc").forEach(function (row) {
      var sw = row.querySelector(".svc__swatch");
      gsap.fromTo(sw, { clipPath: "inset(0 100% 0 0 round 14px)" }, {
        clipPath: "inset(0 0% 0 0 round 14px)", duration: 0.9, ease: "power3.inOut",
        scrollTrigger: { trigger: row, start: "top 85%", once: true }
      });
    });
  }

  /* ---------- How it works: the line connecting the steps fills as you read ---------- */
  function stepsLine() {
    var steps = document.getElementById("steps");
    if (!steps || reduceMotion || !window.gsap) return;
    gsap.fromTo(steps, { "--line": 0 }, {
      "--line": 1, ease: "none",
      scrollTrigger: { trigger: steps, start: "top 75%", end: "bottom 55%", scrub: 0.4 }
    });
    gsap.utils.toArray(".step").forEach(function (s) {
      ScrollTrigger.create({ trigger: s, start: "top 62%", onEnter: function () { s.classList.add("is-on"); },
        onLeaveBack: function () { s.classList.remove("is-on"); } });
    });
  }

  function start() {
    if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    setup();
    intro();
    swatches();
    stepsLine();
    var t;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(setup, 200);
    });
    // Language changes reflow the captions; let ScrollTrigger re-measure.
    document.addEventListener("dgb:lang", function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
