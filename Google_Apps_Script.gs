/**
 * Mehvash & Aliqyaan — RSVP backend for ALL invitation pages
 *   wedding.html              → "Reception" tab
 *   mehvash_raju_wedding.html → "Mehvash & Raju" tab
 *   mehendi.html              → "Mehendi" tab
 *   Mehendi page    → "Mehendi" tab
 *   "Summary" tab   → live totals for both
 *   Mehvash & Raju page → "Mehvash & Raju" tab
 * One Google Sheet, one script, one /exec link shared by all pages.
 *
 * After pasting this code:
 *  1. Select "setup" in the toolbar and click Run (creates/updates the tabs).
 *  2. Deploy > Manage deployments > pencil (Edit) > Version: New version > Deploy.
 *     The /exec link stays the same, so js/config.js does not change.
 *  HOST_KEY stays in Project Settings > Script Properties (unchanged).
 */

// Optional: only needed if this script was created at script.google.com instead of
// from the Sheet (Extensions > Apps Script). Paste the ID from the Sheet URL.
const SHEET_ID = '';

const EVENTS = {
  reception: {
    sheet: 'Reception',
    headers: ['Received at', 'Guest name', 'Attendance', 'Number of guests', 'Submitted at', 'Source', 'Receipt'],
    receiptCol: 7
  },
  mehvash_raju: {
    sheet: 'Mehvash & Raju',
    headers: ['Received at', 'Guest name', 'Attendance', 'Number of guests', 'Submitted at', 'Source', 'Receipt'],
    receiptCol: 7
  },
  mehendi: {
    sheet: 'Mehendi',
    headers: ['Received at', 'Guest name', 'Attendance', 'Ladies', 'Gents', 'Total guests', 'Submitted at', 'Source', 'Receipt'],
    receiptCol: 9
  }
};
const SUMMARY_NAME = 'Summary';

/* ---------- helpers ---------- */

function getBook_() {
  let book = null;
  try { book = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { book = null; }
  if (!book && SHEET_ID) book = SpreadsheetApp.openById(SHEET_ID);
  if (!book) throw new Error('No spreadsheet. Create this script from the Sheet (Extensions > Apps Script) or fill in SHEET_ID.');
  return book;
}

function eventKey_(value) {
  const k = String(value || 'reception').toLowerCase().trim();
  return EVENTS[k] ? k : null;
}

function getSheet_(key) {
  const cfg = EVENTS[key];
  const book = getBook_();
  let sheet = book.getSheetByName(cfg.sheet);
  // One-time migration: the original single-page site saved reception replies to "RSVP".
  if (!sheet && key === 'reception') {
    const old = book.getSheetByName('RSVP');
    if (old) { old.setName(cfg.sheet); sheet = old; }
  }
  if (!sheet) sheet = book.insertSheet(cfg.sheet);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(cfg.headers);
    sheet.getRange(1, 1, 1, cfg.headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (String(sheet.getRange(1, cfg.receiptCol).getValue()) !== 'Receipt') {
    sheet.getRange(1, cfg.receiptCol).setValue('Receipt');
  }
  return sheet;
}

function writeSummary_() {
  const book = getBook_();
  let s = book.getSheetByName(SUMMARY_NAME);
  if (!s) s = book.insertSheet(SUMMARY_NAME);
  s.clear();
  const rows = [
    ['RECEPTION — Friday 18 December 2026 (wedding.html)', ''],
    ['People attending', '=SUMIF(Reception!C2:C,"Yes",Reception!D2:D)'],
    ['Responses: accepted', '=COUNTIF(Reception!C2:C,"Yes")'],
    ['Responses: declined', '=COUNTIF(Reception!C2:C,"No")'],
    ['Total responses', '=COUNTA(Reception!B2:B)'],
    ['', ''],
    ['MEHVASH & RAJU — same reception (mehvash_raju_wedding.html)', ''],
    ['People attending', "=SUMIF('Mehvash & Raju'!C2:C,\"Yes\",'Mehvash & Raju'!D2:D)"],
    ['Responses: accepted', "=COUNTIF('Mehvash & Raju'!C2:C,\"Yes\")"],
    ['Responses: declined', "=COUNTIF('Mehvash & Raju'!C2:C,\"No\")"],
    ['Total responses', "=COUNTA('Mehvash & Raju'!B2:B)"],
    ['', ''],
    ['RECEPTION — people attending from BOTH cards', '=B2+B8'],
    ['', ''],
    ['MEHENDI — Thursday 17 December 2026 (mehendi.html)', ''],
    ['Ladies attending', '=SUMIF(Mehendi!C2:C,"Yes",Mehendi!D2:D)'],
    ['Gents attending', '=SUMIF(Mehendi!C2:C,"Yes",Mehendi!E2:E)'],
    ['People attending (total)', '=SUMIF(Mehendi!C2:C,"Yes",Mehendi!F2:F)'],
    ['Responses: accepted / declined', '=COUNTIF(Mehendi!C2:C,"Yes")&" / "&COUNTIF(Mehendi!C2:C,"No")'],
    ['Total responses', '=COUNTA(Mehendi!B2:B)']
  ];
  s.getRange(1, 1, rows.length, 2).setValues(rows);
  ['A1', 'A7', 'A13', 'B13', 'A15'].forEach(a => s.getRange(a).setFontWeight('bold'));
  s.setColumnWidth(1, 260);
}

// Stops spreadsheet formula injection (a name starting with = + - @)
function safeCell_(value) {
  const s = String(value == null ? '' : value);
  return /^[=+@-]/.test(s) ? "'" + s : s;
}

function count_(v) { return Math.max(0, Math.min(20, parseInt(v, 10) || 0)); }

function receiptExists_(sheet, col, receipt) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  return !!sheet.getRange(2, col, last - 1, 1).createTextFinder(receipt).matchEntireCell(true).findNext();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function jsonp_(callback, obj) {
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(obj) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function readParams_(e) {
  const p = Object.assign({}, (e && e.parameter) || {});
  if (e && e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);
      if (body && typeof body === 'object') Object.assign(p, body);
    } catch (_) { /* form-encoded: already in e.parameter */ }
  }
  return p;
}

/* ---------- save an RSVP ---------- */

function saveRsvp_(p) {
  const key = eventKey_(p.event);
  const name = String(p.name || '').trim().slice(0, 100);
  const attending = String(p.attending || '');
  const receipt = String(p.receipt || '').trim();
  if (!key || !name || ['Yes', 'No'].indexOf(attending) === -1 || !/^[-a-zA-Z0-9_]{12,100}$/.test(receipt)) {
    return { ok: false, status: 'INVALID' };
  }
  const cfg = EVENTS[key];
  let row;
  if (key === 'mehendi') {
    const ladies = attending === 'No' ? 0 : count_(p.ladies);
    const gents = attending === 'No' ? 0 : count_(p.gents);
    if (attending === 'Yes' && ladies + gents < 1) return { ok: false, status: 'INVALID' };
    row = [new Date(), safeCell_(name), attending, ladies, gents, ladies + gents];
  } else {
    const guests = attending === 'No' ? 0 : Math.max(1, count_(p.guests));
    row = [new Date(), safeCell_(name), attending, guests];
  }
  row.push(safeCell_(String(p.submittedAt || '').slice(0, 50)), safeCell_(String(p.source || '').slice(0, 60)), receipt);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(key);
    if (receiptExists_(sheet, cfg.receiptCol, receipt)) return { ok: true, status: 'ALREADY_SAVED' };
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return { ok: true, status: 'SAVED' };
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  try {
    return json_(saveRsvp_(readParams_(e)));
  } catch (err) {
    console.error(err);
    return json_({ ok: false, status: 'ERROR', error: String(err && err.message || err) });
  }
}

/* ---------- GET: health check, receipt check, host guest lists ---------- */

function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = String(p.callback || '');
  const validCb = /^wedding[A-Za-z]*_[a-z0-9]+$/.test(callback);
  const reply = obj => validCb ? jsonp_(callback, obj) : json_(obj);

  try {
    if (p.action === 'receipt') {
      const key = eventKey_(p.event);
      const receipt = String(p.receipt || '');
      const saved = !!key && /^[-a-zA-Z0-9_]{12,100}$/.test(receipt) && receiptExists_(getSheet_(key), EVENTS[key].receiptCol, receipt);
      return reply({ saved: saved });
    }

    if (p.action === 'list') {
      const hostKey = PropertiesService.getScriptProperties().getProperty('HOST_KEY');
      if (!hostKey) return reply({ ok: false, error: 'HOST_KEY is not set in Apps Script > Project Settings > Script Properties.' });
      if (String(p.key || '') !== hostKey) {
        Utilities.sleep(800);
        return reply({ ok: false, error: 'Wrong host key.' });
      }
      const key = eventKey_(p.event);
      if (!key) return reply({ ok: false, error: 'Unknown event.' });
      const sheet = getSheet_(key);
      const last = sheet.getLastRow();
      const width = key === 'mehendi' ? 6 : 4;  // reception & mehvash_raju share the 4-column layout
      const clean = v => String(v).replace(/^'/, '');
      const rows = last < 2 ? [] : sheet.getRange(2, 1, last - 1, width).getValues()
        .filter(r => String(r[1]).trim() !== '')
        .map(r => key === 'mehendi'
          ? { receivedAt: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), name: clean(r[1]), attending: String(r[2]), ladies: Number(r[3]) || 0, gents: Number(r[4]) || 0, guests: Number(r[5]) || 0 }
          : { receivedAt: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), name: clean(r[1]), attending: String(r[2]), guests: Number(r[3]) || 0 });
      return reply({ ok: true, event: key, rows: rows });
    }

    return reply({ ok: true, service: 'Wedding RSVP', events: Object.keys(EVENTS), status: 'running' });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------- run once from the editor ---------- */

function setup() {
  Object.keys(EVENTS).forEach(getSheet_);
  writeSummary_();
  Logger.log('Setup complete: Reception, Mehvash & Raju, Mehendi and Summary tabs are ready in ' + getBook_().getUrl());
}

// Optional: run from the editor to confirm saving works for both events (delete the test rows after).
function testSave() {
  Logger.log(JSON.stringify(saveRsvp_({ event: 'reception', name: 'TEST GUEST (editor)', attending: 'Yes', guests: 2, receipt: 'editor_test_r' + Date.now(), source: 'Apps Script editor' })));
  Logger.log(JSON.stringify(saveRsvp_({ event: 'mehvash_raju', name: 'TEST GUEST (editor)', attending: 'Yes', guests: 2, receipt: 'editor_test_j' + Date.now(), source: 'Apps Script editor' })));
  Logger.log(JSON.stringify(saveRsvp_({ event: 'mehendi', name: 'TEST GUEST (editor)', attending: 'Yes', ladies: 2, gents: 1, receipt: 'editor_test_m' + Date.now(), source: 'Apps Script editor' })));
}
