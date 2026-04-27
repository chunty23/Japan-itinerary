/**
 * Japan 2026 — Trip Data API
 *
 * Single Apps Script web app that backs collaborative editing on
 * japan2026clegg.netlify.app.
 *
 * GET  ?type=all           → all 4 tabs as JSON
 * POST {type, row}         → append one row to that tab
 *
 * Deploy: Extensions → Apps Script → paste this → Deploy → New deployment
 *         → Web app → Execute as "Me", Access "Anyone".
 */

const SHEET_ID = '1vBAilO53g5teNXc3IisZ2-22_JfcPi7wiaMG-bFxCnM';
const TABS = ['Places', 'Bookings', 'Transport', 'Day_Items'];

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const out = {};
    TABS.forEach(name => { out[name] = readTab_(ss, name); });
    return jsonResponse_({ ok: true, data: out, ts: Date.now() });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const type = String(body.type || '').trim();
    const row  = body.row || {};
    if (TABS.indexOf(type) < 0) {
      return jsonResponse_({ ok: false, error: 'Unknown type: ' + type });
    }
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(type);
    if (!sheet) return jsonResponse_({ ok: false, error: 'Sheet not found: ' + type });

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    // Auto-fill server-side fields
    if ('id' in row && !row.id) row.id = Utilities.getUuid().slice(0, 8);
    if ('added_at' in row && !row.added_at) row.added_at = new Date().toISOString();
    if ('status' in row && !row.status) row.status = 'live';

    const newRow = headers.map(h => (row[h] !== undefined ? row[h] : ''));
    sheet.appendRow(newRow);

    return jsonResponse_({ ok: true, type: type, id: row.id });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function readTab_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const range = sheet.getDataRange().getValues();
  if (range.length < 2) return [];
  const headers = range[0];
  return range.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i]; });
    return obj;
  }).filter(r => {
    const s = String(r.status || '').toLowerCase();
    return s !== 'hidden' && s !== 'deleted';
  });
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
