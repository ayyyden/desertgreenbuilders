/*
  English / Spanish switching.
  English text lives in the HTML. Spanish lives here, keyed by data-i18n.
  Elements:  data-i18n="key"            -> innerHTML is swapped
             data-i18n-html="key"       -> same (used where the text holds links)
             data-i18n-attr="attr:key;attr2:key2"
             data-lang-block="en|es"    -> whole blocks shown for one language (legal pages)
*/
(function () {
  var ES = {
    "skip": "Saltar al contenido",
    "nav.services": "Servicios",
    "nav.financing": "Financiamiento",
    "nav.how": "Cómo funciona",
    "nav.faq": "Preguntas",
    "lang.switch": "English",
    "lang.big": "View everything in English",
    "cta.bookShort": "Estimado gratis",
    "cta.book": "Agendar mi estimado gratis",
    "cta.call": "Llamar al (760) 548-2781",
    "bar.call": "Llamar",

    "yard.alt": "Ilustración de un patio de tierra que se convierte en un patio terminado con concreto, adoquines, pasto artificial, grava y plantas del desierto.",
    "hero.l1": "Estimado gratis en su casa.",
    "hero.l2": "Cero compromiso.",
    "hero.sub": "Pasto artificial, adoquines, concreto, grava y remodelaciones completas de patio delantero y trasero. Con licencia, asegurados y afianzados.",
    "hero.hint": "Baje para construir su patio",

    "cap.1.t": "Limpiar y nivelar",
    "cap.1.d": "Quitamos la hierba, sacamos la basura y nivelamos el terreno para que todo quede bien.",
    "cap.2.t": "Concreto",
    "cap.2.d": "Patios, entradas y banquetas, colados y con buen acabado.",
    "cap.3.t": "Adoquines",
    "cap.3.d": "Caminos y patios en el color y diseño que usted escoja.",
    "cap.4.t": "Pasto artificial",
    "cap.4.d": "Verde todo el año. Sin cortar, sin regar y sin lodo.",
    "cap.5.t": "Grava y piedra",
    "cap.5.d": "Piedra decorativa y granito descompuesto que aguantan el calor del desierto.",
    "cap.6.t": "Toques finales",
    "cap.6.d": "Fogatas, bancas de piedra, bordes y plantas del desierto.",
    "cap.7.t": "De tierra a terminado.",
    "cap.7.d": "Patio delantero, trasero o los dos. Todo empieza con un estimado gratis.",

    "trust.licensed": "Con licencia",
    "trust.insured": "Asegurados",
    "trust.bonded": "Afianzados",
    "trust.free": "Estimados gratis",

    "svc.title": "Todo lo de afuera de su casa",
    "svc.lede": "Un solo equipo para todo el patio, desde la primera palada hasta la última piedra.",
    "svc.turf.t": "Pasto artificial",
    "svc.turf.d": "Suave, verde y bonito todo el año. Sin cortar, sin regar y sin lodo que los niños o las mascotas metan a la casa.",
    "svc.pavers.t": "Adoquines",
    "svc.pavers.d": "Patios, caminos, entradas de carro y alrededor de la alberca. Usted escoge el color y el diseño.",
    "svc.concrete.t": "Concreto",
    "svc.concrete.d": "Patios, entradas de carro, banquetas y losas, bien derechos y con buen acabado.",
    "svc.gravel.t": "Grava y piedra",
    "svc.gravel.d": "Piedra decorativa, piedra de río y granito descompuesto. Poco mantenimiento y hecho para el desierto.",
    "svc.hard.t": "Hardscape",
    "svc.hard.d": "Bancas de piedra, jardineras, fogatas, escalones, bordes y guarniciones.",
    "svc.remodel.t": "Remodelación de patio delantero y trasero",
    "svc.remodel.d": "Ya sea desde la tierra o para empezar de nuevo. Planeamos todo el patio con usted y lo construimos completo.",

    "fin.l1": "$0 de enganche.",
    "fin.l2": "Nada que pagar hasta por 24 meses.<sup>*</sup>",
    "fin.lede": "Tenga su patio ahora y pague después con financiamiento promocional de 0% APR, con crédito aprobado para solicitudes que califiquen. Pregúntenos en su estimado gratis.",
    "fin.cta": "Preguntar por financiamiento",
    "fin.short": "*Con crédito aprobado por medio de prestamistas externos. No todos califican. Los términos varían según el prestamista y pueden cambiar. Desert Green Builders no es un prestamista.",
    "fin.more": "Leer los términos completos de financiamiento",
    "fin.fine": "El financiamiento lo ofrecen prestamistas externos, no Desert Green Builders, y está sujeto a aprobación de crédito. Los términos promocionales, incluyendo $0 de enganche, pagos diferidos y 0% APR hasta por 24 meses, están disponibles solo para solicitantes que califiquen y pueden variar según el prestamista, el historial de crédito y el proyecto. Algunos planes pueden cobrar intereses desde la fecha de compra si el saldo promocional no se paga por completo antes de que termine el período promocional. Algunos planes pueden requerir pagos mínimos mensuales. Todos los términos los fija el prestamista, se describen en su contrato de préstamo o crédito y pueden cambiar o terminar en cualquier momento sin aviso. Desert Green Builders no toma decisiones de crédito y no garantiza la aprobación ni ningún término específico. Vea nuestros <a href=\"terms.html#financing\">Términos</a> para más detalles.",

    "how.title": "Cómo funciona",
    "how.lede": "Sin presión y sin sorpresas. Usted decide en cada paso.",
    "how.1.t": "Escoja un horario",
    "how.1.d": "Elija el día y la hora aquí abajo. Toma como un minuto.",
    "how.2.t": "Vamos a su casa",
    "how.2.d": "Recorremos el patio con usted, tomamos medidas y platicamos ideas. Gratis.",
    "how.3.t": "Reciba su estimado",
    "how.3.d": "Le damos un estimado claro de su proyecto. Tómese su tiempo. No hay ningún compromiso.",
    "how.4.t": "Lo construimos",
    "how.4.d": "Si dice que sí, nuestro equipo lo construye y limpia al terminar.",

    "book.title": "Agende su estimado gratis en su casa",
    "book.lede": "Toma como un minuto. Sin compromiso y sin presión.",
    "f.you": "Sus datos",
    "f.name": "Nombre completo",
    "f.phone": "Número de celular",
    "f.sendCode": "Enviarme un código",
    "f.phoneHelp": "Le mandaremos un código de 6 dígitos por mensaje de texto para confirmar su número.",
    "f.code": "Escriba el código de 6 dígitos",
    "f.verify": "Verificar",
    "f.verified": "Número verificado",
    "f.change": "Cambiar",
    "f.where": "¿Dónde es el proyecto?",
    "f.street": "Dirección",
    "f.streetPh": "Empiece a escribir su dirección",
    "f.unit": "Apto. o unidad (opcional)",
    "f.city": "Ciudad",
    "f.zip": "Código postal",
    "f.project": "¿Qué parte del patio?",
    "f.back": "Patio trasero",
    "f.front": "Patio de enfrente",
    "f.both": "Los dos",
    "f.interest": "¿Qué le interesa? (opcional)",
    "f.full": "Remodelación completa",
    "f.finChip": "Financiamiento",
    "f.when": "Escoja el día y la hora",
    "f.whenHelp": "Visitamos de domingo a jueves. Los días llenos aparecen en gris.",
    "cal.prev": "Mes anterior",
    "cal.next": "Mes siguiente",
    "cal.loading": "Cargando días disponibles…",
    "f.consent": "Acepto que Desert Green Builders me llame o me mande mensajes de texto al número de arriba sobre mi estimado. Dar mi consentimiento no es condición de compra. Pueden aplicar tarifas de mensajes y datos. Responda STOP para dejar de recibir mensajes. Acepto los <a href=\"terms.html\" target=\"_blank\" rel=\"noopener\">Términos</a> y la <a href=\"privacy.html\" target=\"_blank\" rel=\"noopener\">Política de privacidad</a>.",
    "f.submit": "Agendar mi estimado gratis",
    "f.fine": "Gratis y sin compromiso. Le llamaremos para confirmar su cita.",

    "ok.title": "¡Listo, ya tiene su cita!",
    "ok.body": "Le llamaremos antes de la visita para confirmar. ¿Necesita cambiar algo? Solo llámenos.",
    "ok.cal": "Agregar a mi calendario",

    "faq.title": "Preguntas que nos hacen",
    "faq.1.q": "¿De verdad el estimado es gratis?",
    "faq.1.a": "Sí. Vamos a su casa, recorremos el patio con usted, tomamos medidas y le damos un estimado sin costo. No tiene ninguna obligación de contratarnos.",
    "faq.2.q": "¿Necesito estar en casa para el estimado?",
    "faq.2.a": "Sí, por favor. Un adulto dueño de la casa debe estar presente para recorrer el patio juntos y contestar sus preguntas.",
    "faq.3.q": "¿Cómo funciona el financiamiento?",
    "faq.3.a": "Trabajamos con prestamistas externos. Si califica, es posible que pueda empezar con $0 de enganche y términos promocionales de 0% APR hasta por 24 meses. La aprobación y los términos los decide el prestamista, no nosotros. Le explicamos sus opciones en el estimado.",
    "faq.4.q": "¿Tienen licencia?",
    "faq.4.a": "Sí. Tenemos licencia, seguro y fianza. Pídanos los datos de nuestra licencia y seguro cuando quiera.",
    "faq.5.q": "¿Trabajan patios de enfrente y traseros?",
    "faq.5.a": "Los dos. Hacemos patios de enfrente, traseros, laterales y entradas de carro, todo junto o por partes.",
    "faq.6.q": "¿Cuánto tarda un proyecto?",
    "faq.6.a": "Depende del tamaño del patio y de lo que quiera poner. Le damos un tiempo estimado junto con su estimado.",

    "close.title": "Veamos cómo puede quedar su patio.",
    "foot.trust": "Con licencia, asegurados y afianzados",
    "foot.terms": "Términos y condiciones",
    "foot.privacy": "Política de privacidad",
    "foot.a11y": "Accesibilidad",
    "foot.rights": "Todos los derechos reservados.",
    "foot.license": "Licencia de contratista de CA #",

    "legal.back": "Volver al inicio"
  };

  var META = {
    en: {
      title: document.title,
      desc: (document.querySelector('meta[name="description"]') || {}).content || ""
    },
    es: {
      title: document.documentElement.getAttribute("data-title-es") ||
        "Desert Green Builders | Pasto artificial, adoquines, concreto y patios",
      desc: document.documentElement.getAttribute("data-desc-es") ||
        "Pasto artificial, adoquines, concreto, grava y remodelación de patios. Estimado gratis en su casa, sin compromiso. Con licencia, asegurados y afianzados."
    }
  };

  var EN = {};      // English captured from the page the first time we switch
  var EN_ATTR = {};
  var current = "en";

  function store(lang) {
    try { localStorage.setItem("dgb-lang", lang); } catch (e) {}
  }
  function stored() {
    try { return localStorage.getItem("dgb-lang"); } catch (e) { return null; }
  }

  function apply(lang) {
    var nodes = document.querySelectorAll("[data-i18n],[data-i18n-html]");
    nodes.forEach(function (el) {
      var key = el.getAttribute("data-i18n") || el.getAttribute("data-i18n-html");
      if (!(key in EN)) EN[key] = el.innerHTML;
      var val = lang === "es" ? ES[key] : EN[key];
      if (val != null && el.innerHTML !== val) el.innerHTML = val;
    });

    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var parts = pair.split(":");
        var attr = parts[0].trim(), key = parts[1].trim();
        var id = key + "|" + attr;
        if (!(id in EN_ATTR)) EN_ATTR[id] = el.getAttribute(attr) || "";
        var val = lang === "es" ? ES[key] : EN_ATTR[id];
        if (val != null) el.setAttribute(attr, val);
      });
    });

    document.querySelectorAll("[data-lang-block]").forEach(function (el) {
      el.hidden = el.getAttribute("data-lang-block") !== lang;
    });

    document.documentElement.lang = lang;
    document.title = META[lang].title;
    var d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute("content", META[lang].desc);

    document.querySelectorAll("[data-lang-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", lang === "es" ? "true" : "false");
      b.setAttribute("lang", lang === "es" ? "en" : "es");
    });

    current = lang;
    document.dispatchEvent(new CustomEvent("dgb:lang", { detail: { lang: lang } }));
  }

  function set(lang) {
    if (lang !== "es") lang = "en";
    store(lang);
    apply(lang);
  }

  window.DGBi18n = {
    get lang() { return current; },
    set: set,
    t: function (key, fallback) { return current === "es" && ES[key] != null ? ES[key] : fallback; }
  };

  function init() {
    var param = new URLSearchParams(location.search).get("lang");
    var initial = param || stored() ||
      ((navigator.language || "").toLowerCase().indexOf("es") === 0 ? "es" : "en");
    // Always capture English first so switching back works.
    apply("en");
    if (initial === "es") apply("es");

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-lang-toggle]");
      if (!btn) return;
      set(current === "es" ? "en" : "es");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
