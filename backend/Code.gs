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
 */

var TZ = 'America/Los_Angeles';
var CONSENT_VERSION = '2026-10-02';
var DEFAULTS = {
  'Appointment times': '8:00 AM, 11:30 AM, 3:00 PM, 6:30 PM',
  'Max appointments per day': 4,
  'Days open for booking': 'Sun, Mon, Tue, Wed, Thu',
  'How many days ahead people can book': 30,
  'Minimum notice (hours)': 18,
  'Appointment length (minutes)': 60,
  'Send new leads to (email)': 'omdandevelopment@gmail.com',
  'Use my Google Calendar (yes/no)': 'yes'
};
var LEAD_HEADERS = ['Received', 'Status', 'Appointment date', 'Time', 'Name', 'Phone', 'Phone verified',
  'Street', 'Unit', 'City', 'State', 'ZIP', 'Map', 'Yard', 'Interested in', 'Language', 'Consent', 'Notes', 'Homeowner'];
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
      return json_({ ok: true, timezone: TZ, phoneVerification: twilioReady_(), days: availability_(s) });
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
    lengthMin: Math.max(15, parseInt(get('Appointment length (minutes)'), 10) || 60),
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

function availability_(s, onlyDate) {
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
  var booked = readBooked_();
  var busy = s.useCalendar ? readCalendarBusy_(toDate_(dates[0], '00:00'), toDate_(dates[dates.length - 1], '23:59')) : [];

  var out = [];
  dates.forEach(function (date) {
    var taken = booked[date] || {};
    var count = Object.keys(taken).reduce(function (n, k) { return n + taken[k]; }, 0);
    if (count >= s.maxPerDay) return;
    var slots = s.slots.filter(function (hm) {
      if (taken[hm]) return false;
      var a = toDate_(date, hm), b = new Date(a.getTime() + s.lengthMin * 60000);
      if (a < earliest) return false;
      for (var j = 0; j < blocks.length; j++) if (blocks[j].covers(date, hm)) return false;
      for (var k = 0; k < busy.length; k++) if (a < busy[k][1] && b > busy[k][0]) return false;
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

function readBooked_() {
  var sh = SpreadsheetApp.getActive().getSheetByName('Leads');
  var map = {};
  if (!sh || sh.getLastRow() < 2) return map;
  sh.getRange(2, 2, sh.getLastRow() - 1, 3).getDisplayValues().forEach(function (r) {
    var status = String(r[0]).toLowerCase();
    if (status === 'cancelled' || status === 'canceled') return;
    var date = String(r[1]).trim(), hm = parseTime_(r[2]);
    if (!date || !hm) return;
    map[date] = map[date] || {};
    map[date][hm] = (map[date][hm] || 0) + 1;
  });
  return map;
}

function readCalendarBusy_(from, to) {
  try {
    var cal = CalendarApp.getDefaultCalendar();
    return cal.getEvents(from, to).map(function (ev) {
      if (ev.isAllDayEvent()) {
        return [ev.getAllDayStartDate(), ev.getAllDayEndDate()];
      }
      return [ev.getStartTime(), ev.getEndTime()];
    });
  } catch (err) {
    console.error('Calendar read failed', err);
    return [];
  }
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
  if (!clean_(b.fullName).match(/\S+\s+\S+/) || !validPhone_(b.phone) || !yards[b.yard] || b.consent !== true ||
      !/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !/^\d{2}:\d{2}$/.test(b.time) ||
      clean_(b.street).length < 5 || clean_(b.city).length < 2 || !/^\d{5}(-\d{4})?$/.test(String(b.zip || ''))) {
    return { ok: false, error: 'invalid' };
  }
  if (!allow_('book:' + b.phone, 3, 3600)) return { ok: false, error: 'rate_limited' };

  var verifyOn = twilioReady_();
  var cache = CacheService.getScriptCache();
  if (verifyOn && cache.get('token:' + b.phoneToken) !== b.phone) return { ok: false, error: 'not_verified' };

  var lock = LockService.getScriptLock();
  var calendarEventId = '', crmLead = null;
  lock.waitLock(20000);
  try {
    var s = getSettings_();
    var open = availability_(s, b.date);
    var free = open.length && open[0].slots.some(function (x) { return x.time === b.time; });
    if (!free) return { ok: false, error: 'slot_taken' };

    var services = (Array.isArray(b.services) ? b.services : []).filter(function (x) { return okServices.indexOf(x) >= 0; });
    var address = [clean_(b.street), clean_(b.unit, 20), clean_(b.city, 60), (clean_(b.state, 2) || 'CA') + ' ' + clean_(b.zip, 10)].filter(String).join(', ');
    var map = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);

    var owner = owner_(b.homeowner);
    var leads = SpreadsheetApp.getActive().getSheetByName('Leads');
    ensureHeaders_(leads);
    leads.appendRow([
      new Date(), 'New', b.date, label_(b.time), clean_(b.fullName, 80), b.phone, verifyOn ? 'Yes' : 'No (verification off)',
      clean_(b.street), clean_(b.unit, 20), clean_(b.city, 60), clean_(b.state, 2) || 'CA', clean_(b.zip, 10), map,
      yards[b.yard], services.join(', '), b.lang === 'es' ? 'Spanish' : 'English',
      'Agreed ' + CONSENT_VERSION + ' (call/text about estimate; terms & privacy)', '', owner
    ]);
    SpreadsheetApp.flush();

    if (s.useCalendar) {
      try {
        var start = toDate_(b.date, b.time);
        var ev = CalendarApp.getDefaultCalendar().createEvent(
          'Estimate: ' + clean_(b.fullName, 80) + ' (' + yards[b.yard] + ')',
          start, new Date(start.getTime() + s.lengthMin * 60000),
          { location: address, description: 'Phone: ' + b.phone + '\nHomeowner: ' + owner + '\nInterested in: ' + (services.join(', ') || '-') +
            '\nLanguage: ' + (b.lang === 'es' ? 'Spanish' : 'English') + '\nMap: ' + map + '\nBooked on desertgreenbuilders.com' });
        calendarEventId = ev.getId().replace(/@google\.com$/, '');   // Calendar API id, as the CRM stores it
      } catch (err) { console.error('Calendar event failed', err); }
    }
    if (b.phoneToken) cache.remove('token:' + b.phoneToken);
    crmLead = {
      booking_id: Utilities.getUuid(),
      full_name: clean_(b.fullName, 80), phone: b.phone, address: address, city: clean_(b.city, 60),
      scheduled_at: toDate_(b.date, b.time).toISOString(), calendar_event_id: calendarEventId || null,
      homeowner: owner, yard: yards[b.yard], interests: services.join(', '),
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
    'New free estimate booked',
    '',
    'When: ' + nice,
    'Name: ' + b.fullName,
    'Phone: ' + b.phone + (verified ? ' (verified)' : ''),
    'Address: ' + address,
    'Map: https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address),
    'Homeowner: ' + owner_(b.homeowner),
    'Yard: ' + (yards[b.yard] || b.yard),
    'Interested in: ' + ((b.services || []).join(', ') || '-'),
    'Language: ' + (b.lang === 'es' ? 'Spanish' : 'English'),
    '',
    'All leads: ' + SpreadsheetApp.getActive().getUrl()
  ];
  MailApp.sendEmail({
    to: s.email,
    subject: 'New estimate: ' + b.fullName + ', ' + nice,
    body: lines.join('\n'),
    name: 'Desert Green Builders website'
  });
}
