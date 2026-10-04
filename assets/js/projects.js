/*
  "Yards we've finished": before / after comparison sliders.
  Drag (or tap) anywhere on the photo to move the divider; vertical swipes still scroll the page.
  The divider is a keyboard slider too. Projects with several photo pairs get numbered buttons.
*/
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function t(key, fallback) { return window.DGBi18n ? DGBi18n.t(key, fallback) : fallback; }

  function setup(proj) {
    var ba = proj.querySelector("[data-ba]");
    var handle = ba.querySelector(".ba__handle");
    var before = ba.querySelector("[data-before]");
    var after = ba.querySelector("[data-after]");
    var id = proj.getAttribute("data-project");
    var count = parseInt(proj.getAttribute("data-pairs"), 10) || 1;
    var views = proj.querySelector(".proj__views");

    function setPos(pct) {
      pct = Math.max(0, Math.min(100, pct));
      ba.style.setProperty("--pos", pct + "%");
      handle.setAttribute("aria-valuenow", Math.round(pct));
    }
    function posFromEvent(e) {
      var r = ba.getBoundingClientRect();
      return (e.clientX - r.left) / r.width * 100;
    }

    // Pointer: horizontal drags move the divider. touch-action: pan-y in CSS keeps vertical scrolling.
    var dragging = false;
    ba.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      dragging = true;
      ba.classList.add("is-dragging");
      try { ba.setPointerCapture(e.pointerId); } catch (err) {}
      setPos(posFromEvent(e));
    });
    ba.addEventListener("pointermove", function (e) { if (dragging) setPos(posFromEvent(e)); });
    function stop() { dragging = false; ba.classList.remove("is-dragging"); }
    ba.addEventListener("pointerup", stop);
    ba.addEventListener("pointercancel", stop);

    handle.addEventListener("keydown", function (e) {
      var now = parseFloat(handle.getAttribute("aria-valuenow")) || 50;
      var step = e.shiftKey ? 20 : 5;
      var map = { ArrowLeft: now - step, ArrowDown: now - step, ArrowRight: now + step, ArrowUp: now + step, Home: 0, End: 100 };
      if (!(e.key in map)) return;
      e.preventDefault();
      setPos(map[e.key]);
    });

    function labels() {
      var title = proj.querySelector("h3").textContent;
      before.alt = t("work.before", "Before") + ": " + title;
      after.alt = t("work.after", "After") + ": " + title;
      if (views) {
        views.querySelectorAll("button").forEach(function (b, i) {
          b.setAttribute("aria-label", t("work.photo", "Photo") + " " + (i + 1));
        });
      }
    }

    function show(n) {
      before.src = "assets/img/projects/" + id + "-" + n + "-before.webp";
      after.src = "assets/img/projects/" + id + "-" + n + "-after.webp";
      setPos(50);
      views.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-pressed", i + 1 === n ? "true" : "false"); });
      // warm the next pair so switching feels instant
      if (n < count) ["before", "after"].forEach(function (k) { new Image().src = "assets/img/projects/" + id + "-" + (n + 1) + "-" + k + ".webp"; });
    }

    if (views) {
      if (count > 1) {
        for (var i = 1; i <= count; i++) {
          var b = document.createElement("button");
          b.type = "button";
          b.textContent = i;
          b.setAttribute("aria-pressed", i === 1 ? "true" : "false");
          b.addEventListener("click", (function (n) { return function () { show(n); }; })(i));
          views.appendChild(b);
        }
      } else {
        views.hidden = true;
      }
    }

    setPos(50);
    labels();
    document.addEventListener("dgb:lang", labels);

    // One small nudge the first time a slider comes into view, so people see it moves.
    if (!reduceMotion && "IntersectionObserver" in window && window.gsap) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        var s = { p: 50 };
        gsap.timeline({ delay: 0.3 })
          .to(s, { p: 68, duration: 0.45, ease: "power2.out", onUpdate: function () { if (!dragging) setPos(s.p); } })
          .to(s, { p: 50, duration: 0.5, ease: "power2.inOut", onUpdate: function () { if (!dragging) setPos(s.p); } });
      }, { threshold: 0.6 });
      io.observe(ba);
    }
  }

  function init() { document.querySelectorAll(".proj").forEach(setup); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
