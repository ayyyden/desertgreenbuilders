/* Ad attribution: remembers which ad brought the visitor here.
 *
 * Reads utm_source / utm_medium / utm_campaign / utm_content / utm_term and
 * fbclid from the landing URL and keeps them for 30 days in a first-party
 * cookie and localStorage, so they survive navigation and a later return
 * visit. A new visit with tags replaces the old ones. The booking form sends
 * them with the booking (booking.js), and the CRM ties the lead to the exact
 * Meta campaign / ad set / ad.
 *
 * Meta ads set:  utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.id}}
 *                &utm_content={{ad.id}}&utm_term={{adset.id}}
 */
(function () {
  "use strict";
  var KEY = "dgb_attr";
  var FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
  var MAX_AGE_DAYS = 30;

  function readCookie() {
    var m = document.cookie.match(new RegExp("(?:^|; )" + KEY + "=([^;]*)"));
    if (!m) return null;
    try { return JSON.parse(decodeURIComponent(m[1])); } catch (e) { return null; }
  }

  function save(record) {
    var json = JSON.stringify(record);
    try { localStorage.setItem(KEY, json); } catch (e) { /* private mode */ }
    document.cookie = KEY + "=" + encodeURIComponent(json) +
      "; max-age=" + MAX_AGE_DAYS * 86400 + "; path=/; SameSite=Lax" +
      (location.protocol === "https:" ? "; Secure" : "");
  }

  function load() {
    var record = null;
    try { record = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { record = null; }
    if (!record) record = readCookie();
    if (!record || !record.ts || Date.now() - record.ts > MAX_AGE_DAYS * 86400000) return null;
    return record;
  }

  // Capture on landing — only when the URL actually carries tags
  try {
    var params = new URLSearchParams(location.search);
    var found = {};
    var any = false;
    FIELDS.forEach(function (k) {
      var v = (params.get(k) || "").trim();
      if (v) { found[k] = v.slice(0, 300); any = true; }
    });
    if (any) {
      found.ts = Date.now();
      found.landing = location.pathname;
      save(found);
    }
  } catch (e) { /* never break the page */ }

  window.DGBAttribution = {
    /** { utm_source, …, fbclid } captured in the last 30 days, or null */
    get: function () {
      var r = load();
      if (!r) return null;
      var out = {};
      FIELDS.forEach(function (k) { if (r[k]) out[k] = r[k]; });
      return out;
    }
  };
})();
