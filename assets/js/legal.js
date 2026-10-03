(function () {
  var CFG = window.DGB_CONFIG || {};
  document.querySelectorAll("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });

  function licenseLines() {
    if (!CFG.licenseNumber) return;
    var es = window.DGBi18n && DGBi18n.lang === "es";
    document.querySelectorAll("[data-license-line]").forEach(function (n) {
      var inEs = n.closest('[data-lang-block="es"]');
      n.textContent = ((inEs || es) ? "Licencia de contratista de California (CSLB) #" : "California Contractor License (CSLB) #") + CFG.licenseNumber +
        ((inEs || es) ? ", emitida a Omdan Development Inc." : ", issued to Omdan Development Inc.");
      n.hidden = false;
    });
  }

  // The Spanish sections use their own anchor ids (e.g. #financing -> #financiamiento).
  var ES_ANCHORS = { financing: "financiamiento" };
  function followHash() {
    var id = location.hash.slice(1);
    if (!id) return;
    var es = window.DGBi18n && DGBi18n.lang === "es";
    var target = document.getElementById(es && ES_ANCHORS[id] ? ES_ANCHORS[id] : id);
    if (target && target.offsetParent !== null) target.scrollIntoView();
  }

  licenseLines();
  followHash();
  document.addEventListener("dgb:lang", function () { licenseLines(); followHash(); });
})();
