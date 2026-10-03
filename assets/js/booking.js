/*
  Booking form: phone verification, address autocomplete, calendar and submit.
  Talks to the Google Apps Script backend (backend/Code.gs) at DGB_CONFIG.bookingEndpoint.
  With no endpoint set it runs a local demo on localhost (verification code 123456),
  and on the live site it tells people to call instead.
*/
(function () {
  var CFG = window.DGB_CONFIG || {};
  var ENDPOINT = CFG.bookingEndpoint || "";
  var TZ = CFG.timeZone || "America/Los_Angeles";
  var host = location.hostname;
  var isLocal = location.protocol === "file:" || host === "localhost" || /^127\.|^192\.168\./.test(host);
  var DEMO = !ENDPOINT && (isLocal || /[?&]demo=1\b/.test(location.search));
  var OFFLINE = !ENDPOINT && !DEMO;

  var T = {
    en: {
      "err.name": "Please enter your first and last name.",
      "err.phone": "Enter a 10-digit US phone number.",
      "err.verifyFirst": "Please confirm your phone number with the code we text you.",
      "err.codeFormat": "Enter the 6-digit code.",
      "err.code": "That code didn't work. Check it and try again, or send a new one.",
      "err.send": "We couldn't send a code right now. Try again in a minute, or call us at (760) 548-2781.",
      "err.rate": "Too many tries. Please wait a few minutes or call us at (760) 548-2781.",
      "err.street": "Enter the street address of the project.",
      "err.city": "Enter the city.",
      "err.zip": "Enter a 5-digit ZIP code.",
      "err.yard": "Choose backyard, front yard or both.",
      "err.date": "Pick a day for the estimate.",
      "err.time": "Pick a time for the estimate.",
      "err.consent": "Please check the box so we can contact you about your estimate.",
      "err.fix": "Please fix the highlighted fields below.",
      "err.taken": "Sorry, that time was just booked by someone else. Please pick another time.",
      "err.generic": "Something went wrong and your estimate wasn't booked. Please try again, or call us at <a href=\"tel:+17605482781\">(760) 548-2781</a>.",
      "err.offline": "Online booking isn't open yet. Call or text us at <a href=\"tel:+17605482781\">(760) 548-2781</a> and we'll set up your free estimate.",
      "err.avail": "We couldn't load the open days. Refresh the page or call us at <a href=\"tel:+17605482781\">(760) 548-2781</a>.",
      "sent": "We texted a code to {phone}.",
      "resendIn": "Send a new code in {s}s",
      "resend": "Send a new code",
      "busy.send": "Sending…",
      "busy.verify": "Checking…",
      "busy.submit": "Booking…",
      "slotsFor": "Open times on {date}",
      "noDays": "No open days left this month. Try the next month.",
      "addr.none": "No matches yet. Keep typing, or fill in the address yourself.",
      "when": "{date} at {time}",
      "ics.title": "Free estimate with Desert Green Builders",
      "ics.desc": "Free on-site estimate. Questions or changes: (760) 548-2781.",
      "cal.group": "Days"
    },
    es: {
      "err.name": "Escriba su nombre y apellido.",
      "err.phone": "Escriba un número de teléfono de EE. UU. de 10 dígitos.",
      "err.verifyFirst": "Confirme su número con el código que le enviamos por mensaje.",
      "err.codeFormat": "Escriba el código de 6 dígitos.",
      "err.code": "Ese código no funcionó. Revíselo e intente de nuevo, o pida uno nuevo.",
      "err.send": "No pudimos enviar el código en este momento. Intente en un minuto o llámenos al (760) 548-2781.",
      "err.rate": "Demasiados intentos. Espere unos minutos o llámenos al (760) 548-2781.",
      "err.street": "Escriba la dirección del proyecto.",
      "err.city": "Escriba la ciudad.",
      "err.zip": "Escriba un código postal de 5 dígitos.",
      "err.yard": "Escoja patio trasero, de enfrente o los dos.",
      "err.date": "Escoja un día para el estimado.",
      "err.time": "Escoja una hora para el estimado.",
      "err.consent": "Marque la casilla para que podamos contactarle sobre su estimado.",
      "err.fix": "Corrija los campos marcados abajo.",
      "err.taken": "Lo sentimos, alguien acaba de agendar ese horario. Escoja otra hora.",
      "err.generic": "Algo salió mal y su estimado no se agendó. Intente de nuevo o llámenos al <a href=\"tel:+17605482781\">(760) 548-2781</a>.",
      "err.offline": "Todavía no se puede agendar en línea. Llámenos o mándenos un mensaje al <a href=\"tel:+17605482781\">(760) 548-2781</a> y le agendamos su estimado gratis.",
      "err.avail": "No pudimos cargar los días disponibles. Recargue la página o llámenos al <a href=\"tel:+17605482781\">(760) 548-2781</a>.",
      "sent": "Le enviamos un código al {phone}.",
      "resendIn": "Pedir otro código en {s}s",
      "resend": "Pedir otro código",
      "busy.send": "Enviando…",
      "busy.verify": "Revisando…",
      "busy.submit": "Agendando…",
      "slotsFor": "Horarios disponibles el {date}",
      "noDays": "Ya no hay días disponibles este mes. Revise el mes siguiente.",
      "addr.none": "Todavía no hay resultados. Siga escribiendo o escriba la dirección usted mismo.",
      "when": "{date} a las {time}",
      "ics.title": "Estimado gratis con Desert Green Builders",
      "ics.desc": "Estimado gratis en su casa. Preguntas o cambios: (760) 548-2781.",
      "cal.group": "Días"
    }
  };

  function lang() { return window.DGBi18n ? DGBi18n.lang : "en"; }
  function locale() { return lang() === "es" ? "es-US" : "en-US"; }
  function t(key, vars) {
    var s = (T[lang()] && T[lang()][key]) || T.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace("{" + k + "}", vars[k]); });
    return s;
  }
  function $(id) { return document.getElementById(id); }

  var form = $("bookingForm");
  if (!form) return;
  var loadedAt = Date.now();

  var state = {
    verifyEnabled: true,
    verified: false,
    token: "",
    days: {},          // "YYYY-MM-DD" -> ["08:00", ...]
    months: [],        // [{y, m}] months that have bookable days
    monthIndex: 0,
    date: "",
    time: "",
    errors: {},        // field -> message key, so errors can be re-rendered on language change
    statusKey: "",
    resendTimer: null,
    resendLeft: 0,
    booked: null
  };

  /* ---------- API ---------- */
  function api(method, payload) {
    if (DEMO) return demoApi(method, payload);
    var opts = { method: method, redirect: "follow" };
    var url = ENDPOINT;
    if (method === "GET") url += (url.indexOf("?") < 0 ? "?" : "&") + new URLSearchParams(payload).toString();
    // text/plain keeps this a "simple" CORS request, which Apps Script accepts.
    else { opts.body = JSON.stringify(payload); opts.headers = { "Content-Type": "text/plain;charset=utf-8" }; }
    return fetch(url, opts).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  /* ---------- Status and field errors ---------- */
  function showStatus(key) {
    state.statusKey = key || "";
    var box = $("formStatus");
    if (!key) { box.hidden = true; box.innerHTML = ""; return; }
    box.innerHTML = t(key);
    box.hidden = false;
  }
  function setError(field, key) {
    if (key) state.errors[field] = key; else delete state.errors[field];
    var errEl = $(field + "-err");
    if (errEl) errEl.textContent = key ? t(key) : "";
    var input = $(field);
    if (input && input.tagName === "INPUT") {
      if (key) { input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", ((input.getAttribute("aria-describedby") || "").replace(field + "-err", "") + " " + field + "-err").trim()); }
      else input.removeAttribute("aria-invalid");
    }
  }
  function rerenderErrors() {
    Object.keys(state.errors).forEach(function (f) { setError(f, state.errors[f]); });
    if (state.statusKey) showStatus(state.statusKey);
  }

  /* ---------- Phone ---------- */
  var phone = $("phone"), code = $("code");
  function digits(v) {
    var d = (v || "").replace(/\D/g, "");
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    return d.slice(0, 10);
  }
  function formatPhone(d) {
    if (d.length < 4) return d;
    if (d.length < 7) return "(" + d.slice(0, 3) + ") " + d.slice(3);
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  }
  function validPhone(d) { return /^[2-9]\d{2}[2-9]\d{6}$/.test(d); }
  function e164() { return "+1" + digits(phone.value); }

  phone.addEventListener("input", function () {
    var d = digits(phone.value);
    var atEnd = phone.selectionStart === phone.value.length;
    phone.value = formatPhone(d);
    if (atEnd) phone.setSelectionRange(phone.value.length, phone.value.length);
    if (state.errors.phone && validPhone(d)) setError("phone", null);
  });

  function setBusy(btn, busy, key) {
    if (!btn) return;
    var label = btn.querySelector("[data-i18n]") || btn;
    if (busy) {
      btn.dataset.label = label.innerHTML;
      label.textContent = t(key);
      btn.setAttribute("aria-busy", "true");
      btn.disabled = true;
    } else {
      if (btn.dataset.label) label.innerHTML = btn.dataset.label;
      btn.removeAttribute("aria-busy");
      btn.disabled = false;
    }
  }

  function startResendTimer() {
    clearInterval(state.resendTimer);
    state.resendLeft = 30;
    var b = $("resendCode");
    function tick() {
      if (state.resendLeft > 0) { b.disabled = true; b.textContent = t("resendIn", { s: state.resendLeft }); }
      else { b.disabled = false; b.textContent = t("resend"); clearInterval(state.resendTimer); }
      state.resendLeft--;
    }
    tick();
    state.resendTimer = setInterval(tick, 1000);
  }

  function sendCode() {
    var d = digits(phone.value);
    if (!validPhone(d)) { setError("phone", "err.phone"); phone.focus(); return; }
    setError("phone", null);
    setError("code", null);
    var btn = $("sendCode");
    setBusy(btn, true, "busy.send");
    api("POST", { action: "sendCode", phone: e164(), lang: lang() }).then(function (res) {
      setBusy(btn, false);
      if (res.ok) {
        $("codeRow").hidden = false;
        $("phone-help").textContent = t("sent", { phone: formatPhone(d) });
        startResendTimer();
        code.value = "";
        code.focus();
      } else {
        setError("phone", res.error === "rate_limited" ? "err.rate" : res.error === "invalid_phone" ? "err.phone" : "err.send");
      }
    }).catch(function () { setBusy(btn, false); setError("phone", "err.send"); });
  }

  function verifyCode() {
    var c = (code.value || "").replace(/\D/g, "");
    if (c.length !== 6) { setError("code", "err.codeFormat"); code.focus(); return; }
    var btn = $("verifyCode");
    setBusy(btn, true, "busy.verify");
    api("POST", { action: "verifyCode", phone: e164(), code: c }).then(function (res) {
      setBusy(btn, false);
      if (res.ok && res.token) {
        state.verified = true;
        state.token = res.token;
        setError("code", null);
        setError("phone", null);
        markVerified(true);
      } else {
        setError("code", res.error === "rate_limited" ? "err.rate" : "err.code");
        code.select();
      }
    }).catch(function () { setBusy(btn, false); setError("code", "err.send"); });
  }

  function markVerified(on) {
    $("codeRow").hidden = true;
    $("phoneVerified").hidden = !on;
    $("sendCode").hidden = on || !state.verifyEnabled;
    phone.readOnly = on;
    clearInterval(state.resendTimer);
  }

  $("sendCode").addEventListener("click", sendCode);
  $("resendCode").addEventListener("click", sendCode);
  $("verifyCode").addEventListener("click", verifyCode);
  code.addEventListener("input", function () {
    code.value = code.value.replace(/\D/g, "").slice(0, 6);
    if (code.value.length === 6) verifyCode();
  });
  code.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); verifyCode(); } });
  phone.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && state.verifyEnabled && !state.verified) { e.preventDefault(); sendCode(); }
  });
  $("changePhone").addEventListener("click", function () {
    state.verified = false; state.token = "";
    markVerified(false);
    $("phone-help").textContent = window.DGBi18n ? DGBi18n.t("f.phoneHelp", "We'll text you a 6-digit code to confirm your number.") : "";
    phone.focus();
    phone.select();
  });

  function applyVerifyMode() {
    if (state.verifyEnabled) return;
    $("sendCode").hidden = true;
    $("phone-help").hidden = true;
    $("codeRow").hidden = true;
  }

  /* ---------- Address autocomplete (Photon, OpenStreetMap data) ---------- */
  var street = $("street"), list = $("addrList");
  var addrResults = [], active = -1, addrTimer = null, addrAbort = null;
  var STATES = { California: "CA", Arizona: "AZ", Nevada: "NV" };

  function closeList() {
    list.hidden = true; list.innerHTML = ""; active = -1;
    street.setAttribute("aria-expanded", "false");
    street.removeAttribute("aria-activedescendant");
  }
  function renderList() {
    list.innerHTML = "";
    if (!addrResults.length) {
      var li = document.createElement("li");
      li.className = "combo__note"; li.setAttribute("role", "option"); li.setAttribute("aria-disabled", "true");
      li.textContent = t("addr.none");
      list.appendChild(li);
    }
    addrResults.forEach(function (r, i) {
      var li = document.createElement("li");
      li.id = "addr-opt-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === active ? "true" : "false");
      li.textContent = r.line1;
      var small = document.createElement("small");
      small.textContent = r.line2;
      li.appendChild(small);
      li.addEventListener("mousedown", function (e) { e.preventDefault(); pick(i); });
      list.appendChild(li);
    });
    list.hidden = false;
    street.setAttribute("aria-expanded", "true");
    if (active >= 0) street.setAttribute("aria-activedescendant", "addr-opt-" + active);
    else street.removeAttribute("aria-activedescendant");
  }
  function pick(i) {
    var r = addrResults[i];
    if (!r) return;
    street.value = r.line1;
    $("city").value = r.city || "";
    $("zip").value = r.zip || "";
    $("state").value = r.state || "CA";
    $("lat").value = r.lat; $("lon").value = r.lon;
    ["street", "city", "zip"].forEach(function (f) { if ($(f).value) setError(f, null); });
    closeList();
    $("unit").focus();
    if (r.guessedNumber) fixZip(r);
  }

  // When OpenStreetMap only matched the street, its ZIP can belong to another stretch of that street.
  // The US Census geocoder knows address ranges, so ask it for the exact ZIP (JSONP: it has no CORS).
  var zipSeq = 0;
  function fixZip(r) {
    var seq = ++zipSeq, cb = "dgbZip" + Date.now(), done = false;
    var s = document.createElement("script");
    function cleanup() { done = true; try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
    window[cb] = function (data) {
      if (done) return;
      cleanup();
      var m = data && data.result && data.result.addressMatches && data.result.addressMatches[0];
      var zip = m && m.addressComponents && m.addressComponents.zip;
      // Only apply it if the person hasn't picked another address or edited the ZIP since.
      if (!zip || seq !== zipSeq || street.value !== r.line1 || $("zip").value !== r.zip) return;
      $("zip").value = zip;
      $("lat").value = m.coordinates.y; $("lon").value = m.coordinates.x;
    };
    s.src = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=jsonp&callback=" + cb +
      "&address=" + encodeURIComponent(r.line1 + ", " + r.city + ", " + (r.state || "CA"));
    s.onerror = cleanup;
    setTimeout(function () { if (!done) cleanup(); }, 8000);
    document.head.appendChild(s);
  }
  function searchAddress(q) {
    if (addrAbort) addrAbort.abort();
    addrAbort = "AbortController" in window ? new AbortController() : null;
    var bias = CFG.addressBias || { lat: 33.72, lon: -116.37 };
    var url = "https://photon.komoot.io/api/?limit=6&lang=en" +
      "&lat=" + bias.lat + "&lon=" + bias.lon +
      "&bbox=-124.6,32.4,-114.0,42.1" +
      "&q=" + encodeURIComponent(q);
    fetch(url, addrAbort ? { signal: addrAbort.signal } : {}).then(function (r) { return r.json(); }).then(function (data) {
      var seen = {};
      // OpenStreetMap often knows the street but not the house number. Keep the number the person typed.
      var typed = q.match(/^\s*(\d+[A-Za-z]?(?:-\d+)?)\s+\S/);
      var typedNum = typed ? typed[1] : "";
      addrResults = (data.features || []).map(function (f) {
        var p = f.properties || {};
        if (p.countrycode && p.countrycode !== "US") return null;
        var road = p.street || (p.type === "street" ? p.name : "");
        if (!road) return null;
        if (!p.housenumber && typedNum && p.type !== "street") return null;   // some other building on a different street
        var num = p.housenumber || typedNum;
        var line1 = (num ? num + " " : "") + road;
        var st = STATES[p.state] || p.state || "";
        var city = p.city || p.town || p.village || p.district || p.county || "";
        var zip = (p.postcode || "").slice(0, 5);
        var key = line1 + city;
        if (seen[key]) return null;
        seen[key] = true;
        return { guessedNumber: !p.housenumber && !!typedNum, line1: line1, line2: [city, [st, p.housenumber || !typedNum ? zip : ""].join(" ").trim()].filter(Boolean).join(", "),
          city: city, state: st, zip: zip, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
      }).filter(Boolean);
      active = -1;
      if (document.activeElement === street) renderList();
    }).catch(function () { /* autocomplete is a convenience; typing by hand still works */ });
  }
  street.addEventListener("input", function () {
    $("lat").value = ""; $("lon").value = "";
    clearTimeout(addrTimer);
    var q = street.value.trim();
    if (q.length < 4) { closeList(); return; }
    addrTimer = setTimeout(function () { searchAddress(q); }, 260);
  });
  street.addEventListener("keydown", function (e) {
    if (list.hidden || !addrResults.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); active = (active + 1) % addrResults.length; renderList(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); active = (active - 1 + addrResults.length) % addrResults.length; renderList(); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(active); }
    else if (e.key === "Escape") { closeList(); }
  });
  street.addEventListener("blur", function () { setTimeout(closeList, 120); });

  $("zip").addEventListener("input", function () { this.value = this.value.replace(/[^\d-]/g, "").slice(0, 10); });

  /* ---------- Calendar ---------- */
  var grid = $("calGrid");
  grid.setAttribute("role", "group");

  function ymd(y, m, d) { return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }
  function parseYmd(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtDate(s, long) {
    return parseYmd(s).toLocaleDateString(locale(), long ? { weekday: "long", month: "long", day: "numeric" } : { month: "short", day: "numeric" });
  }
  function fmtTime(hm) {
    var p = hm.split(":");
    return new Date(2000, 0, 1, +p[0], +p[1]).toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });
  }

  function loadAvailability() {
    if (OFFLINE) {
      showStatus("err.offline");
      $("calLoading").hidden = true;
      $("sendCode").disabled = true;
      $("submitBtn").disabled = true;
      return;
    }
    api("GET", { action: "availability" }).then(function (res) {
      if (!res.ok) throw new Error(res.error || "bad response");
      state.verifyEnabled = res.phoneVerification !== false;
      applyVerifyMode();
      state.days = {};
      (res.days || []).forEach(function (d) { if (d.slots && d.slots.length) state.days[d.date] = d.slots.map(function (s) { return s.time || s; }); });
      var keys = Object.keys(state.days).sort();
      var months = [];
      var today = new Date();
      var first = { y: today.getFullYear(), m: today.getMonth() };
      months.push(first);
      if (keys.length) {
        var last = parseYmd(keys[keys.length - 1]);
        var y = first.y, m = first.m;
        while (y < last.getFullYear() || (y === last.getFullYear() && m < last.getMonth())) {
          m++; if (m > 11) { m = 0; y++; }
          months.push({ y: y, m: m });
        }
        // open on the first month with an open day
        var firstOpen = parseYmd(keys[0]);
        state.monthIndex = months.findIndex(function (mm) { return mm.y === firstOpen.getFullYear() && mm.m === firstOpen.getMonth(); });
      }
      state.months = months;
      $("calendar").classList.add("is-ready");
      if (state.date && !state.days[state.date]) { state.date = ""; state.time = ""; }
      renderCalendar();
      renderSlots();
    }).catch(function () {
      $("calLoading").innerHTML = t("err.avail");
    });
  }

  function renderCalendar() {
    if (!state.months.length) return;
    var mm = state.months[state.monthIndex];
    var monthDate = new Date(mm.y, mm.m, 1);
    var monthLabel = monthDate.toLocaleDateString(locale(), { month: "long", year: "numeric" });
    $("calMonth").textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
    $("calPrev").disabled = state.monthIndex === 0;
    $("calNext").disabled = state.monthIndex >= state.months.length - 1;
    grid.setAttribute("aria-label", t("cal.group"));

    var dow = $("calDow");
    dow.innerHTML = "";
    for (var i = 0; i < 7; i++) {
      var s = document.createElement("span");
      s.textContent = new Date(2024, 8, 1 + i).toLocaleDateString(locale(), { weekday: "short" }).replace(".", "");
      dow.appendChild(s);
    }

    grid.innerHTML = "";
    var lead = monthDate.getDay();
    for (i = 0; i < lead; i++) {
      var blank = document.createElement("span");
      blank.className = "cal__day cal__day--blank";
      grid.appendChild(blank);
    }
    var daysIn = new Date(mm.y, mm.m + 1, 0).getDate();
    var anyOpen = false;
    for (var d = 1; d <= daysIn; d++) {
      var key = ymd(mm.y, mm.m, d);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cal__day";
      b.textContent = d;
      b.dataset.date = key;
      var open = !!state.days[key];
      anyOpen = anyOpen || open;
      b.disabled = !open;
      b.setAttribute("aria-label", fmtDate(key, true));
      b.setAttribute("aria-selected", key === state.date ? "true" : "false");
      b.setAttribute("aria-pressed", key === state.date ? "true" : "false");
      grid.appendChild(b);
    }
    if (!anyOpen) {
      var note = document.createElement("p");
      note.style.gridColumn = "1 / -1";
      note.className = "fs__sub";
      note.textContent = t("noDays");
      grid.appendChild(note);
    }
  }

  grid.addEventListener("click", function (e) {
    var b = e.target.closest(".cal__day");
    if (!b || b.disabled || !b.dataset.date) return;
    state.date = b.dataset.date;
    state.time = "";
    setError("date", null);
    renderCalendar();
    renderSlots();
    var first = document.querySelector("#slots input:not(:disabled)");
    if (first) first.focus({ preventScroll: true });
    $("slotsWrap").scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  grid.addEventListener("keydown", function (e) {
    var keys = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in keys)) return;
    var btns = Array.prototype.slice.call(grid.querySelectorAll(".cal__day:not(.cal__day--blank)"));
    var i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    for (var j = i + keys[e.key]; j >= 0 && j < btns.length; j += Math.sign(keys[e.key])) {
      if (!btns[j].disabled) { btns[j].focus(); break; }
      if (Math.abs(keys[e.key]) === 7) break;
    }
  });
  $("calPrev").addEventListener("click", function () { if (state.monthIndex > 0) { state.monthIndex--; renderCalendar(); } });
  $("calNext").addEventListener("click", function () { if (state.monthIndex < state.months.length - 1) { state.monthIndex++; renderCalendar(); } });

  function renderSlots() {
    var wrap = $("slotsWrap"), box = $("slots");
    if (!state.date || !state.days[state.date]) { wrap.hidden = true; box.innerHTML = ""; return; }
    $("slotsLabel").textContent = t("slotsFor", { date: fmtDate(state.date, true) });
    box.innerHTML = "";
    state.days[state.date].forEach(function (hm) {
      var label = document.createElement("label");
      label.className = "slot";
      var input = document.createElement("input");
      input.type = "radio"; input.name = "time"; input.value = hm;
      input.checked = hm === state.time;
      input.addEventListener("change", function () { state.time = hm; setError("time", null); });
      var span = document.createElement("span");
      span.textContent = fmtTime(hm);
      label.appendChild(input); label.appendChild(span);
      box.appendChild(label);
    });
    wrap.hidden = false;
  }

  /* ---------- Validation and submit ---------- */
  function validate() {
    var bad = [];
    function check(field, ok, key) { setError(field, ok ? null : key); if (!ok) bad.push(field); }
    var name = $("fullName").value.trim();
    check("fullName", name.length >= 3 && /\S+\s+\S+/.test(name), "err.name");
    var d = digits(phone.value);
    if (!validPhone(d)) check("phone", false, "err.phone");
    else check("phone", !state.verifyEnabled || state.verified, "err.verifyFirst");
    check("street", street.value.trim().length >= 5 && /\d/.test(street.value), "err.street");
    check("city", $("city").value.trim().length >= 2, "err.city");
    check("zip", /^\d{5}(-\d{4})?$/.test($("zip").value.trim()), "err.zip");
    check("yard", !!form.querySelector('input[name="yard"]:checked'), "err.yard");
    check("date", !!state.date, "err.date");
    if (state.date) check("time", !!state.time, "err.time"); else setError("time", null);
    check("consent", $("consent").checked, "err.consent");
    return bad;
  }

  function focusField(f) {
    var target = {
      yard: form.querySelector('input[name="yard"]'),
      date: grid.querySelector(".cal__day:not([disabled])") || $("calNext"),
      time: form.querySelector('#slots input')
    }[f] || $(f);
    if (target) {
      target.focus({ preventScroll: true });
      (target.closest(".field, .fs") || target).scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  form.addEventListener("change", function (e) {
    if (e.target.name === "yard") setError("yard", null);
    if (e.target.id === "consent" && e.target.checked) setError("consent", null);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (OFFLINE) { showStatus("err.offline"); return; }
    showStatus(null);
    var bad = validate();
    if (bad.length) {
      showStatus("err.fix");
      focusField(bad[0]);
      return;
    }
    var payload = {
      action: "book",
      fullName: $("fullName").value.trim(),
      phone: e164(),
      phoneToken: state.token,
      street: street.value.trim(),
      unit: $("unit").value.trim(),
      city: $("city").value.trim(),
      state: $("state").value || "CA",
      zip: $("zip").value.trim(),
      lat: $("lat").value, lon: $("lon").value,
      yard: form.querySelector('input[name="yard"]:checked').value,
      services: Array.prototype.map.call(form.querySelectorAll('input[name="services"]:checked'), function (i) { return i.value; }),
      date: state.date,
      time: state.time,
      lang: lang(),
      consent: true,
      company: $("company").value,
      elapsedMs: Date.now() - loadedAt,
      page: location.href.split("#")[0]
    };
    var btn = $("submitBtn");
    setBusy(btn, true, "busy.submit");
    api("POST", payload).then(function (res) {
      setBusy(btn, false);
      if (res.ok) return done(payload);
      if (res.error === "slot_taken") {
        showStatus("err.taken");
        state.time = "";
        loadAvailability();
        focusField("time");
      } else if (res.error === "not_verified") {
        state.verified = false; state.token = "";
        markVerified(false);
        setError("phone", "err.verifyFirst");
        focusField("phone");
      } else {
        showStatus("err.generic");
      }
    }).catch(function () {
      setBusy(btn, false);
      showStatus("err.generic");
    });
  });

  function done(p) {
    state.booked = { date: p.date, time: p.time };
    renderSuccess();
    form.hidden = true;
    var ok = $("bookingSuccess");
    ok.hidden = false;
    ok.classList.add("is-shown");
    ok.focus({ preventScroll: true });
    ok.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  function renderSuccess() {
    if (!state.booked) return;
    $("successWhen").textContent = t("when", { date: fmtDate(state.booked.date, true), time: fmtTime(state.booked.time) });
  }

  /* ---------- Add to calendar (.ics) ---------- */
  function zonedToUtc(dateStr, hm) {
    var p = dateStr.split("-").map(Number), h = hm.split(":").map(Number);
    var guess = Date.UTC(p[0], p[1] - 1, p[2], h[0], h[1]);
    for (var i = 0; i < 2; i++) {
      var parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date(guess)).reduce(function (o, x) { o[x.type] = x.value; return o; }, {});
      var asIfUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
      guess += Date.UTC(p[0], p[1] - 1, p[2], h[0], h[1]) - asIfUtc;
    }
    return new Date(guess);
  }
  function icsStamp(d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
  $("addToCal").addEventListener("click", function () {
    if (!state.booked) return;
    var start = zonedToUtc(state.booked.date, state.booked.time);
    var end = new Date(start.getTime() + 60 * 60 * 1000);
    var addr = [street.value.trim(), $("unit").value.trim(), $("city").value.trim(), ($("state").value + " " + $("zip").value).trim()].filter(Boolean).join(", ");
    var esc = function (s) { return s.replace(/([,;\\])/g, "\\$1"); };
    var ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Desert Green Builders//Estimate//EN", "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + Date.now() + "@desertgreenbuilders.com",
      "DTSTAMP:" + icsStamp(new Date()),
      "DTSTART:" + icsStamp(start),
      "DTEND:" + icsStamp(end),
      "SUMMARY:" + esc(t("ics.title")),
      "DESCRIPTION:" + esc(t("ics.desc")),
      "LOCATION:" + esc(addr),
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    var a = document.createElement("a");
    a.href = url; a.download = "desert-green-builders-estimate.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  });

  /* ---------- Language changes ---------- */
  document.addEventListener("dgb:lang", function () {
    renderCalendar();
    renderSlots();
    rerenderErrors();
    renderSuccess();
    if (state.resendLeft > 0 || !$("codeRow").hidden) {
      var b = $("resendCode");
      b.textContent = state.resendLeft > 0 ? t("resendIn", { s: state.resendLeft }) : t("resend");
    }
    if (!$("codeRow").hidden && validPhone(digits(phone.value))) $("phone-help").textContent = t("sent", { phone: formatPhone(digits(phone.value)) });
  });

  /* ---------- Local demo (no backend yet) ---------- */
  function demoApi(method, p) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        if (method === "GET") {
          var days = [], now = new Date();
          var slots = ["08:00", "11:30", "15:00", "18:30"];
          for (var i = 1; i <= 35; i++) {
            var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            var wd = d.getDay();
            if (wd === 5 || wd === 6) continue;               // no Friday or Saturday
            if (i % 9 === 4) continue;                         // pretend a few days are full
            var open = slots.filter(function (s, n) { return (i + n) % 5 !== 0; });
            days.push({ date: ymd(d.getFullYear(), d.getMonth(), d.getDate()), slots: open.map(function (s) { return { time: s }; }) });
          }
          return resolve({ ok: true, phoneVerification: true, days: days });
        }
        if (p.action === "sendCode") { console.info("[demo] verification code is 123456"); return resolve({ ok: true }); }
        if (p.action === "verifyCode") return resolve(p.code === "123456" ? { ok: true, token: "demo-token" } : { ok: false, error: "bad_code" });
        if (p.action === "book") { console.info("[demo] booking payload", p); return resolve({ ok: true }); }
        resolve({ ok: false, error: "unknown" });
      }, method === "GET" ? 350 : 700);
    });
  }

  loadAvailability();
})();
