/**
 * Desert Green Builders booking backend (Google Apps Script, bound to a Google Sheet).
 * Setup steps are in backend/SETUP.md.
 *
 * Sheets:
 *   Leads     every booking. Set Status to "Cancelled" to free up that time.
 *   Blocked   days or hours you're not available.
 *   Settings  appointment times, max per day, how far ahead people can book, etc.
 * Your Google Calendar: anything on it blocks that time (all-day events block the day),
 *   and every new booking is added to it.
 * Drive times: one salesman drives to every estimate, so a time is only offered when he can
 *   finish the appointment before it (Appointment length) + drive there + the buffer, and
 *   likewise make the one after it. Drive times between ZIP codes come from Google Maps once
 *   and are saved in the "Drive times" tab; ServiceZips.gs (second file) has the ZIP list.
 */

var TZ = 'America/Los_Angeles';
var CONSENT_VERSION = '2026-10-02';
var DEFAULTS = {
  'Appointment times': '9:00 AM, 10:00 AM, 11:00 AM, 12:00 PM, 1:00 PM, 2:00 PM, 3:00 PM, 4:00 PM, 5:00 PM, 6:00 PM, 7:00 PM',
  'Max appointments per day': 4,
  'Days open for booking': 'Sun, Mon, Tue, Wed, Thu',
  'How many days ahead people can book': 30,
  'Minimum notice (hours)': 18,
  'Appointment length (minutes)': 120,
  'Extra buffer between appointments (minutes)': 15,
  'Use drive time between appointments (yes/no)': 'yes',
  'Send new leads to (email)': 'omdandevelopment@gmail.com',
  'Use my Google Calendar (yes/no)': 'yes'
};
var LEAD_HEADERS = ['Received', 'Status', 'Appointment date', 'Time', 'Name', 'Phone', 'Phone verified',
  'Street', 'Unit', 'City', 'State', 'ZIP', 'Map', 'Yard', 'Interested in', 'Language', 'Consent', 'Notes', 'Homeowner', 'Service'];
// Answers from the /roofing/ estimate page
var ROOF = {
  need: { 'leak-repair': 'Leak repair', 'replacement': 'Roof replacement', 'fascia-repair': 'Fascia repair', 'not-sure': 'Not sure what they need' },
  type: { shingle: 'Shingle roof', tile: 'Tile roof', flat: 'Flat or foam roof', metal: 'Metal roof', 'not-sure': 'Roof type not sure' },
  leaking: { yes: 'Leaking now', no: 'Not leaking now', 'not-sure': 'Not sure if leaking' },
  stories: { '1': '1 story', '2': '2 stories', '3+': '3+ stories' }
};
function isRoof_(b) { return !!b && b.service === 'roofing'; }
/** "Leak repair; Tile roof; Leaking now; 1 story" (known answers only) */
function roofDetails_(b) {
  var r = (b && b.roof && typeof b.roof === 'object') ? b.roof : {};
  return ['need', 'type', 'leaking', 'stories'].map(function (k) { return ROOF[k][r[k]]; }).filter(Boolean).join('; ');
}
var BLOCK_HEADERS = ['Date', 'End date (optional)', 'From time (optional)', 'To time (optional)', 'Note'];
var DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/* ------------------------------------------------------------------ */
/* Spreadsheet menu and one-time setup                                 */
/* ------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Desert Green')
    .addItem('1. Set up sheets', 'setup')
    .addItem('2. Send a test lead email', 'testEmail')
    .addItem('Show open times (check)', 'showAvailability')
    .addToUi();
}

function setup() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);

  var leads = ss.getSheetByName('Leads') || ss.insertSheet('Leads');
  if (leads.getLastRow() === 0) {
    leads.appendRow(LEAD_HEADERS);
    leads.getRange(1, 1, 1, LEAD_HEADERS.length).setFontWeight('bold').setBackground('#EEF3E6');
    leads.setFrozenRows(1);
    leads.getRange('C:D').setNumberFormat('@');
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(['New', 'Confirmed', 'Done', 'Cancelled', 'No show'], true).build();
    leads.getRange('B2:B').setDataValidation(rule);
  }

  var blocked = ss.getSheetByName('Blocked') || ss.insertSheet('Blocked');
  if (blocked.getLastRow() === 0) {
    blocked.appendRow(BLOCK_HEADERS);
    blocked.getRange(1, 1, 1, BLOCK_HEADERS.length).setFontWeight('bold').setBackground('#EEF3E6');
    blocked.setFrozenRows(1);
    blocked.getRange('A:B').setNumberFormat('yyyy-mm-dd');
    blocked.getRange('C:D').setNumberFormat('@');
    blocked.getRange('F1').setValue('How to use: one row per block. Date only = whole day off. Add an end date to block several days. ' +
      'Add From/To times (like 1:00 PM) to block only part of a day. Delete the row to open it back up.');
  }

  var settings = ss.getSheetByName('Settings') || ss.insertSheet('Settings');
  if (settings.getLastRow() === 0) {
    settings.appendRow(['Setting', 'Value']);
    Object.keys(DEFAULTS).forEach(function (k) { settings.appendRow([k, DEFAULTS[k]]); });
    settings.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#EEF3E6');
    settings.getRange('B:B').setNumberFormat('@');
    settings.setColumnWidth(1, 300);
    settings.setColumnWidth(2, 320);
  }

  var first = ss.getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);
  SpreadsheetApp.getActive().toast('Sheets are ready.');
}

function testEmail() {
  var s = getSettings_();
  notify_(s, {
    fullName: 'Test Lead', phone: '+17605550123', street: '123 Example St', unit: '', city: 'Palm Desert',
    state: 'CA', zip: '92260', yard: 'both', services: ['turf', 'pavers'], lang: 'en'
  }, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), '08:00', true);
  SpreadsheetApp.getActive().toast('Test email sent to ' + s.email);
}

function showAvailability() {
  var days = availability_(getSettings_());
  var text = days.slice(0, 10).map(function (d) {
    return d.date + ': ' + d.slots.map(function (s) { return label_(s.time); }).join(', ');
  }).join('\n');
  SpreadsheetApp.getUi().alert('Next open days', text || 'No open days.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ------------------------------------------------------------------ */
/* Web app                                                             */
/* ------------------------------------------------------------------ */

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'availability') {
      var s = getSettings_();
      var zip = String(e.parameter.zip || '').replace(/\D/g, '').slice(0, 5);
      return json_({ ok: true, timezone: TZ, phoneVerification: twilioReady_(), days: availability_(s, null, zip.length === 5 ? zip : '') });
    }
    return json_({ ok: true, service: 'Desert Green Builders booking' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }
  try {
    switch (body.action) {
      case 'sendCode': return json_(sendCode_(body));
      case 'verifyCode': return json_(verifyCode_(body));
      case 'book': return json_(book_(body));
      default: return json_({ ok: false, error: 'bad_request' });
    }
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

function getSettings_() {
  var raw = {};
  var sh = SpreadsheetApp.getActive().getSheetByName('Settings');
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues().forEach(function (r) { raw[String(r[0]).trim()] = String(r[1]).trim(); });
  }
  function get(k) { return raw[k] !== undefined && raw[k] !== '' ? raw[k] : DEFAULTS[k]; }
  if (sh && sh.getLastRow() > 0) {
    Object.keys(DEFAULTS).forEach(function (k) { if (raw[k] === undefined) sh.appendRow([k, String(DEFAULTS[k])]); });
  }

  var slots = String(get('Appointment times')).split(',').map(parseTime_).filter(Boolean).sort();
  var days = String(get('Days open for booking')).toLowerCase().split(',').map(function (d) {
    return DAY_NAMES.indexOf(d.trim().slice(0, 3));
  }).filter(function (i) { return i >= 0 && i !== 5 && i !== 6; });   // never Friday or Saturday

  return {
    slots: slots,
    maxPerDay: Math.max(1, parseInt(get('Max appointments per day'), 10) || 4),
    workDays: days,
    daysAhead: Math.min(120, Math.max(1, parseInt(get('How many days ahead people can book'), 10) || 30)),
    minNoticeHours: Math.max(0, parseFloat(get('Minimum notice (hours)')) || 0),
    lengthMin: Math.max(15, parseInt(get('Appointment length (minutes)'), 10) || 120),
    bufferMin: Math.max(0, parseInt(get('Extra buffer between appointments (minutes)'), 10) || 0),
    useDrive: /^y/i.test(String(get('Use drive time between appointments (yes/no)'))),
    email: String(get('Send new leads to (email)')),
    useCalendar: /^y/i.test(String(get('Use my Google Calendar (yes/no)')))
  };
}

/** "8:00 AM", "8am", "13:30", "1:30pm" -> "HH:mm"  (also accepts Date values from time cells) */
function parseTime_(v) {
  if (v instanceof Date) return pad_(v.getHours()) + ':' + pad_(v.getMinutes());
  var m = String(v || '').trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/);
  if (!m) return '';
  var h = parseInt(m[1], 10), min = parseInt(m[2] || '0', 10);
  if (m[3] && m[3][0] === 'p' && h < 12) h += 12;
  if (m[3] && m[3][0] === 'a' && h === 12) h = 0;
  if (h > 23 || min > 59) return '';
  return pad_(h) + ':' + pad_(min);
}
function pad_(n) { return (n < 10 ? '0' : '') + n; }
function label_(hm) {
  var p = hm.split(':'), h = +p[0];
  return ((h + 11) % 12 + 1) + ':' + p[1] + (h < 12 ? ' AM' : ' PM');
}
function toDate_(ymd, hm) { return Utilities.parseDate(ymd + ' ' + hm, TZ, 'yyyy-MM-dd HH:mm'); }
function ymd_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

/**
 * Open times per day. With a customer ZIP (and drive time on), a time T is open only if, for every
 * other appointment A that day:  A before T -> A ends + drive(A -> customer) + buffer <= T,
 * A after T -> T + length + drive(customer -> A) + buffer <= A starts.  Appointments whose place
 * is unknown (e.g. a personal calendar event) just can't overlap.
 */
function availability_(s, onlyDate, zip) {
  var now = new Date();
  var earliest = new Date(now.getTime() + s.minNoticeHours * 3600 * 1000);
  var todayYmd = ymd_(now);
  var start = toDate_(todayYmd, '12:00');
  var dates = [];
  for (var i = 0; i <= s.daysAhead; i++) {
    var d = new Date(start.getTime() + i * 86400000);
    var key = ymd_(d);
    if (onlyDate && key !== onlyDate) continue;
    var wd = parseInt(Utilities.formatDate(d, TZ, 'u'), 10) % 7;   // 'u' is 1 = Monday ... 7 = Sunday
    if (s.workDays.indexOf(wd) < 0) continue;
    dates.push(key);
  }
  if (!dates.length) return [];

  var blocks = readBlocks_();
  var appts = readAppointments_(s, toDate_(dates[0], '00:00'), toDate_(dates[dates.length - 1], '23:59'));
  var travel = !!(zip && s.useDrive);
  var gap = s.bufferMin * 60000, len = s.lengthMin * 60000;

  var out = [];
  dates.forEach(function (date) {
    var taken = appts.booked[date] || {};
    var count = Object.keys(taken).reduce(function (n, k) { return n + taken[k]; }, 0);
    if (count >= s.maxPerDay) return;
    var day = appts.byDate[date] || [];
    var slots = s.slots.filter(function (hm) {
      if (taken[hm]) return false;
      var a = toDate_(date, hm), b = new Date(a.getTime() + len);
      if (a < earliest) return false;
      for (var j = 0; j < blocks.length; j++) if (blocks[j].covers(date, hm)) return false;
      for (var k = 0; k < day.length; k++) {
        var x = day[k];
        if (travel && x.zip && !x.allDay) {
          if (x.start <= a) {
            if (x.end.getTime() + driveMinutes_(x.zip, zip) * 60000 + gap > a.getTime()) return false;
          } else if (b.getTime() + driveMinutes_(zip, x.zip) * 60000 + gap > x.start.getTime()) return false;
        } else if (a < x.end && b > x.start) return false;
      }
      return true;
    });
    if (slots.length) out.push({ date: date, slots: slots.map(function (hm) { return { time: hm }; }) });
  });
  return out;
}

function readBlocks_() {
  var sh = SpreadsheetApp.getActive().getSheetByName('Blocked');
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().map(function (r) {
    var from = r[0] instanceof Date ? ymd_(r[0]) : String(r[0]).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return null;
    var to = r[1] instanceof Date ? ymd_(r[1]) : (String(r[1]).trim() || from);
    var t0 = parseTime_(r[2]) || '00:00', t1 = parseTime_(r[3]) || '23:59';
    return { covers: function (date, hm) { return date >= from && date <= to && hm >= t0 && hm <= t1; } };
  }).filter(Boolean);
}

/**
 * Appointments between two dates, from the Leads tab (date, time, ZIP) and Google Calendar.
 * booked:  { 'yyyy-MM-dd': { 'HH:mm': count } }  Leads only, for "max per day" and taken times.
 * byDate:  { 'yyyy-MM-dd': [ { start, end, zip, allDay } ] }  everything David has that day.
 * A calendar event that starts at the same minute as a Leads row is the same appointment.
 */
function readAppointments_(s, from, to) {
  var booked = {}, byDate = {}, keyed = {};
  function add(date, appt) { (byDate[date] = byDate[date] || []).push(appt); }

  var sh = SpreadsheetApp.getActive().getSheetByName('Leads');
  if (sh && sh.getLastRow() >= 2) {
    sh.getRange(2, 2, sh.getLastRow() - 1, 11).getDisplayValues().forEach(function (r) {   // B status .. L ZIP
      var status = String(r[0]).toLowerCase();
      if (status === 'cancelled' || status === 'canceled') return;
      var date = String(r[1]).trim(), hm = parseTime_(r[2]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !hm) return;
      booked[date] = booked[date] || {};
      booked[date][hm] = (booked[date][hm] || 0) + 1;
      var start = toDate_(date, hm);
      if (start < from || start > to) return;
      var appt = { start: start, end: new Date(start.getTime() + s.lengthMin * 60000), zip: zip5_(r[10]), allDay: false };
      keyed[date + ' ' + hm] = appt;
      add(date, appt);
    });
  }

  if (s.useCalendar) {
    readCalendarBusy_(from, to).forEach(function (ev) {
      var date = ymd_(ev.start);
      var same = !ev.allDay && keyed[date + ' ' + Utilities.formatDate(ev.start, TZ, 'HH:mm')];
      if (same) {   // the website's own event for a Leads row: keep the longer of the two, fill in a ZIP
        if (ev.end > same.end) same.end = ev.end;
        if (!same.zip) same.zip = ev.zip;
        return;
      }
      add(date, ev);
    });
  }
  return { booked: booked, byDate: byDate };
}

function readCalendarBusy_(from, to) {
  try {
    var cal = CalendarApp.getDefaultCalendar();
    return cal.getEvents(from, to).map(function (ev) {
      if (ev.isAllDayEvent()) return { start: ev.getAllDayStartDate(), end: ev.getAllDayEndDate(), zip: '', allDay: true };
      // where it is: the event's location, else an address in the description (the CRM writes "Address: ...")
      var zip = zip5_(ev.getLocation()) || zip5_(ev.getDescription());
      return { start: ev.getStartTime(), end: ev.getEndTime(), zip: zip, allDay: false };
    });
  } catch (err) {
    console.error('Calendar read failed', err);
    return [];
  }
}

/** First California-style ZIP code (90000-96199) in a piece of text, or ''. */
function zip5_(text) {
  var m = String(text || '').match(/(?:^|[^\d])(9[0-6]\d{3})(?:-\d{4})?(?![\d])/);
  return m ? m[1] : '';
}

/* ------------------------------------------------------------------ */
/* Drive times between ZIP codes                                       */
/* ------------------------------------------------------------------ */

var driveCache_ = null;   // 'zipA|zipB' -> minutes (zipA < zipB), filled once per request

function driveMinutes_(fromZip, toZip) {
  if (!fromZip || !toZip) return 0;
  if (fromZip === toZip) return 10;
  var key = fromZip < toZip ? fromZip + '|' + toZip : toZip + '|' + fromZip;
  var sh = null;
  try { sh = SpreadsheetApp.getActive().getSheetByName('Drive times'); } catch (err) { console.error(err); }
  if (!driveCache_) {
    driveCache_ = {};
    try {   // the saved table is a speed-up only: if it can't be read or made, carry on without it
      if (!sh) {
        sh = SpreadsheetApp.getActive().insertSheet('Drive times');
        sh.appendRow(['ZIP A', 'ZIP B', 'Minutes', 'Source', 'Looked up']);
        sh.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#EEF3E6');
        sh.getRange('A:B').setNumberFormat('@');
        sh.setFrozenRows(1);
      } else if (sh.getLastRow() >= 2) {
        sh.getRange(2, 1, sh.getLastRow() - 1, 3).getDisplayValues().forEach(function (r) {
          var m = parseFloat(r[2]);
          if (r[0] && r[1] && m > 0) driveCache_[r[0] < r[1] ? r[0] + '|' + r[1] : r[1] + '|' + r[0]] = m;
        });
      }
    } catch (err) { console.error('Drive times tab unavailable', err); sh = null; }
  }
  if (driveCache_[key]) return driveCache_[key];

  var pair = key.split('|'), minutes = 0, source = 'Google Maps';
  try {
    var dir = Maps.newDirectionFinder().setOrigin(place_(pair[0])).setDestination(place_(pair[1]))
      .setMode(Maps.DirectionFinder.Mode.DRIVING).getDirections();
    if (dir && dir.routes && dir.routes.length) minutes = Math.round(dir.routes[0].legs[0].duration.value / 60);
  } catch (err) {
    console.error('Google Maps drive time failed for ' + key, err);
  }
  if (!minutes) { minutes = estimateDrive_(pair[0], pair[1]); source = 'Estimate (straight-line distance)'; }
  driveCache_[key] = minutes;
  if (sh) { try { sh.appendRow([pair[0], pair[1], minutes, source, new Date()]); } catch (err) { console.error(err); } }
  return minutes;
}

/** Where a ZIP is, for Google Maps: its centre point when we know it, otherwise "ZIP, CA". */
function place_(zip) {
  var p = (typeof SERVICE_ZIPS !== 'undefined') && SERVICE_ZIPS[zip];
  return p && p[0] != null ? p[0] + ',' + p[1] : zip + ', CA';
}

/** Backup when Google Maps isn't available: straight-line miles x 1.3 for roads, at 45 mph, + 10 min. */
function estimateDrive_(a, b) {
  var pa = (typeof SERVICE_ZIPS !== 'undefined') && SERVICE_ZIPS[a];
  var pb = (typeof SERVICE_ZIPS !== 'undefined') && SERVICE_ZIPS[b];
  if (!pa || !pb || pa[0] == null || pb[0] == null) return 90;   // unknown place: assume a long drive
  var R = 3959, toRad = Math.PI / 180;
  var dLat = (pb[0] - pa[0]) * toRad, dLon = (pb[1] - pa[1]) * toRad;
  var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(pa[0] * toRad) * Math.cos(pb[0] * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var miles = 2 * R * Math.asin(Math.sqrt(h));
  return Math.round(miles * 1.3 / 45 * 60 + 10);
}

/* ------------------------------------------------------------------ */
/* Phone verification (Twilio Verify)                                  */
/* ------------------------------------------------------------------ */

function twilioReady_() {
  var p = PropertiesService.getScriptProperties();
  return !!(p.getProperty('TWILIO_ACCOUNT_SID') && p.getProperty('TWILIO_AUTH_TOKEN') && p.getProperty('TWILIO_VERIFY_SID'));
}

function twilio_(path, params) {
  var p = PropertiesService.getScriptProperties();
  var res = UrlFetchApp.fetch('https://verify.twilio.com/v2/Services/' + p.getProperty('TWILIO_VERIFY_SID') + '/' + path, {
    method: 'post',
    payload: params,
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(p.getProperty('TWILIO_ACCOUNT_SID') + ':' + p.getProperty('TWILIO_AUTH_TOKEN')) },
    muteHttpExceptions: true
  });
  var data = {};
  try { data = JSON.parse(res.getContentText()); } catch (e) {}
  return { status: res.getResponseCode(), data: data };
}

function validPhone_(p) { return /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(String(p || '')); }

/** Counts hits in a time window; returns false once the limit is passed. */
function allow_(key, limit, seconds) {
  var cache = CacheService.getScriptCache();
  var n = parseInt(cache.get(key) || '0', 10) + 1;
  cache.put(key, String(n), seconds);
  return n <= limit;
}

function sendCode_(b) {
  if (!validPhone_(b.phone)) return { ok: false, error: 'invalid_phone' };
  if (!twilioReady_()) return { ok: true, disabled: true };
  if (!allow_('send:' + b.phone, 3, 600) || !allow_('send:all', 60, 3600)) return { ok: false, error: 'rate_limited' };
  var r = twilio_('Verifications', { To: b.phone, Channel: 'sms', Locale: b.lang === 'es' ? 'es' : 'en' });
  if (r.status === 201 || r.status === 200) return { ok: true };
  console.error('Twilio send failed', r.status, JSON.stringify(r.data));
  if (r.status === 429) return { ok: false, error: 'rate_limited' };
  if (r.data && r.data.code === 60200) return { ok: false, error: 'invalid_phone' };
  return { ok: false, error: 'send_failed' };
}

function verifyCode_(b) {
  if (!validPhone_(b.phone) || !/^\d{6}$/.test(String(b.code || ''))) return { ok: false, error: 'bad_code' };
  if (!twilioReady_()) return { ok: false, error: 'bad_code' };
  if (!allow_('check:' + b.phone, 6, 600)) return { ok: false, error: 'rate_limited' };
  var r = twilio_('VerificationCheck', { To: b.phone, Code: String(b.code) });
  if (r.status === 200 && r.data && r.data.status === 'approved') {
    var token = Utilities.getUuid();
    CacheService.getScriptCache().put('token:' + token, b.phone, 3600);
    return { ok: true, token: token };
  }
  return { ok: false, error: 'bad_code' };
}

/* ------------------------------------------------------------------ */
/* Booking                                                             */
/* ------------------------------------------------------------------ */

function clean_(v, max) {
  var s = String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max || 120);
  return /^[=+\-@]/.test(s) ? "'" + s : s;   // never let a lead write a spreadsheet formula
}

function book_(b) {
  // Bots: pretend it worked, store nothing.
  if (b.company || (b.elapsedMs && b.elapsedMs < 3000)) return { ok: true };

  var yards = { backyard: 'Backyard', front: 'Front yard', both: 'Both' };
  var okServices = ['turf', 'pavers', 'concrete', 'gravel', 'hardscape', 'full-remodel', 'financing'];
  var roof = isRoof_(b);
  var jobOk = roof ? !!(b.roof && ROOF.need[b.roof.need]) : !!yards[b.yard];
  if (!clean_(b.fullName).match(/\S+\s+\S+/) || !validPhone_(b.phone) || !jobOk || b.consent !== true ||
      !/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !/^\d{2}:\d{2}$/.test(b.time) ||
      clean_(b.street).length < 5 || clean_(b.city).length < 2 || !/^\d{5}(-\d{4})?$/.test(String(b.zip || ''))) {
    return { ok: false, error: 'invalid' };
  }
  var zip = String(b.zip || '').slice(0, 5);
  if (typeof SERVICE_ZIPS !== 'undefined' && !SERVICE_ZIPS[zip]) return { ok: false, error: 'out_of_area' };
  if (!allow_('book:' + b.phone, 3, 3600)) return { ok: false, error: 'rate_limited' };

  var verifyOn = twilioReady_();
  var cache = CacheService.getScriptCache();
  if (verifyOn && cache.get('token:' + b.phoneToken) !== b.phone) return { ok: false, error: 'not_verified' };

  var lock = LockService.getScriptLock();
  var calendarEventId = '', crmLead = null;
  lock.waitLock(20000);
  try {
    var s = getSettings_();
    var open = availability_(s, b.date, zip);
    var free = open.length && open[0].slots.some(function (x) { return x.time === b.time; });
    if (!free) return { ok: false, error: 'slot_taken' };

    var services = (Array.isArray(b.services) ? b.services : []).filter(function (x) { return okServices.indexOf(x) >= 0; });
    var address = [clean_(b.street), clean_(b.unit, 20), clean_(b.city, 60), (clean_(b.state, 2) || 'CA') + ' ' + clean_(b.zip, 10)].filter(String).join(', ');
    var map = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);

    var owner = owner_(b.homeowner);
    var details = roof ? roofDetails_(b) : services.join(', ');
    var leads = SpreadsheetApp.getActive().getSheetByName('Leads');
    ensureHeaders_(leads);
    leads.appendRow([
      new Date(), 'New', b.date, label_(b.time), clean_(b.fullName, 80), b.phone, verifyOn ? 'Yes' : 'No (verification off)',
      clean_(b.street), clean_(b.unit, 20), clean_(b.city, 60), clean_(b.state, 2) || 'CA', clean_(b.zip, 10), map,
      roof ? 'Roofing' : yards[b.yard], details, b.lang === 'es' ? 'Spanish' : 'English',
      'Agreed ' + CONSENT_VERSION + ' (call/text about estimate; terms & privacy)', '', owner, roof ? 'Roofing' : 'Landscaping'
    ]);
    SpreadsheetApp.flush();

    if (s.useCalendar) {
      try {
        var start = toDate_(b.date, b.time);
        var ev = CalendarApp.getDefaultCalendar().createEvent(
          roof ? 'Roof estimate: ' + clean_(b.fullName, 80) + ' (' + ROOF.need[b.roof.need] + ')'
               : 'Estimate: ' + clean_(b.fullName, 80) + ' (' + yards[b.yard] + ')',
          start, new Date(start.getTime() + s.lengthMin * 60000),
          { location: address, description: 'Phone: ' + b.phone + '\nHomeowner: ' + owner + (roof ? '\nRoof: ' : '\nInterested in: ') + (details || '-') +
            '\nLanguage: ' + (b.lang === 'es' ? 'Spanish' : 'English') + '\nMap: ' + map + '\nBooked on desertgreenbuilders.com' + (roof ? '/roofing (all homeowners asked to be present)' : '') });
        calendarEventId = ev.getId().replace(/@google\.com$/, '');   // Calendar API id, as the CRM stores it
      } catch (err) { console.error('Calendar event failed', err); }
    }
    if (b.phoneToken) cache.remove('token:' + b.phoneToken);
    crmLead = {
      booking_id: Utilities.getUuid(),
      full_name: clean_(b.fullName, 80), phone: b.phone, address: address, city: clean_(b.city, 60),
      scheduled_at: toDate_(b.date, b.time).toISOString(), calendar_event_id: calendarEventId || null,
      homeowner: owner, yard: roof ? null : yards[b.yard], interests: roof ? 'Roofing: ' + details : services.join(', '),
      language: b.lang === 'es' ? 'Spanish' : 'English', phone_verified: verifyOn
    };
    // Ad attribution captured on the landing page (assets/js/attribution.js):
    // utm_* + fbclid, so the CRM can tie the booking to the exact Meta ad.
    var attr = (b.attribution && typeof b.attribution === 'object') ? b.attribution : {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(function (k) {
      if (attr[k]) crmLead[k] = clean_(attr[k], 300);
    });
  } finally {
    lock.releaseLock();
  }

  try { notify_(getSettings_(), b, b.date, b.time, verifyOn); } catch (err) { console.error('Email failed', err); }
  try { sendToCrm_(crmLead); } catch (err) { console.error('CRM sync failed', err); }
  return { ok: true };
}

/**
 * Copies the booking onto the Meta Leads page of the Omdan Command Center CRM (Scheduled list).
 * Needs Script Properties CRM_URL and CRM_SECRET; without them it does nothing.
 * Never blocks the booking: failures are only logged.
 */
function sendToCrm_(lead) {
  var p = PropertiesService.getScriptProperties();
  var url = p.getProperty('CRM_URL'), secret = p.getProperty('CRM_SECRET');
  if (!lead || !url || !secret) return;
  var opts = { method: 'post', contentType: 'application/json', payload: JSON.stringify(lead),
    headers: { 'x-website-secret': secret }, muteHttpExceptions: true, followRedirects: false };
  for (var attempt = 1; attempt <= 2; attempt++) {
    try {
      var res = UrlFetchApp.fetch(url, opts), code = res.getResponseCode();
      if (code === 200 || code === 201) return;
      console.error('CRM rejected lead (attempt ' + attempt + ')', code, res.getContentText().slice(0, 300));
      if (code >= 400 && code < 500) return;   // bad key or bad data: retrying won't help
    } catch (err) {
      console.error('CRM unreachable (attempt ' + attempt + ')', err);
    }
    Utilities.sleep(1500);
  }
}

function owner_(v) { return v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Not answered'; }

/** Adds any header the Leads tab is missing (e.g. "Homeowner" on sheets set up before it existed). */
function ensureHeaders_(sh) {
  var have = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
  LEAD_HEADERS.forEach(function (h, i) {
    if (!have[i]) sh.getRange(1, i + 1).setValue(h).setFontWeight('bold').setBackground('#EEF3E6');
  });
}

function notify_(s, b, date, time, verified) {
  if (!s.email) return;
  var yards = { backyard: 'Backyard', front: 'Front yard', both: 'Both' };
  var nice = Utilities.formatDate(toDate_(date, time), TZ, 'EEEE, MMMM d') + ' at ' + label_(time);
  var address = [b.street, b.unit, b.city, (b.state || 'CA') + ' ' + b.zip].filter(String).join(', ');
  var lines = [
    isRoof_(b) ? 'New free ROOF estimate booked' : 'New free estimate booked',
    '',
    'When: ' + nice,
    'Name: ' + b.fullName,
    'Phone: ' + b.phone + (verified ? ' (verified)' : ''),
    'Address: ' + address,
    'Map: https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address),
    'Homeowner: ' + owner_(b.homeowner),
    isRoof_(b) ? 'Roofing: ' + (roofDetails_(b) || '-') : 'Yard: ' + (yards[b.yard] || b.yard),
    isRoof_(b) ? 'Booked on the roofing page. All homeowners were asked to be there.' : 'Interested in: ' + ((b.services || []).join(', ') || '-'),
    'Language: ' + (b.lang === 'es' ? 'Spanish' : 'English'),
    '',
    'All leads: ' + SpreadsheetApp.getActive().getUrl()
  ];
  MailApp.sendEmail({
    to: s.email,
    subject: (isRoof_(b) ? 'New ROOF estimate: ' : 'New estimate: ') + b.fullName + ', ' + nice,
    body: lines.join('\n'),
    name: 'Desert Green Builders website'
  });
}
