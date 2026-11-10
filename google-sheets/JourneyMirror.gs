/**
 * Journey Tracker → Google Sheet mirror.
 *
 * Paste this whole file into the sheet's Extensions → Apps Script, set SECRET
 * to the secret key shown in the app (Settings → Google Sheet mirror), then
 * Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Full steps: google-sheets/README.md.
 *
 * The app sends finished tables; this script only writes them. Each update
 * rewrites the tabs the app owns (Summary, Daily, Items, …) and never touches a
 * tab you add yourself, so your own charts and formulas can point at them.
 * Every update also keeps a backup of the raw data: one per day, for 60 days.
 */

const SECRET = 'PASTE-YOUR-SECRET-KEY-HERE';
const BACKUP_DAYS = 60;
const BACKUP_TAB = 'Backups';
/** Google Sheets allows 50,000 characters per cell; backups are split into parts below that. */
const PART = 45000;
const HEADER_COLOR = '#ede9fe';

function doGet() {
  return reply({ ok: true, app: 'journey-mirror', ready: SECRET !== 'PASTE-YOUR-SECRET-KEY-HERE' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'That was not a Journey Tracker update.' });
  }
  if (SECRET === 'PASTE-YOUR-SECRET-KEY-HERE') {
    return reply({ ok: false, error: 'Set SECRET in the Apps Script, then deploy a new version (Deploy → Manage deployments → Edit → New version).' });
  }
  if (body.secret !== SECRET) {
    return reply({ ok: false, error: 'Wrong secret key: it must match SECRET in the Apps Script (and the script must be redeployed after changing it).' });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return reply({ ok: false, error: 'The sheet is busy with another update. It will try again.' });
  try {
    const props = PropertiesService.getScriptProperties();
    // Two devices can push at about the same time: never let an older copy replace a newer one.
    const last = props.getProperty('generatedAt') || '';
    if (body.generatedAt && body.generatedAt < last) return reply({ ok: true, skipped: true });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    (body.tables || []).forEach(function (t, i) {
      writeTable(ss, t, i);
    });
    if (body.backup && body.backup.json) writeBackup(ss, body.backup, body.generatedAt);
    props.setProperty('generatedAt', body.generatedAt || new Date().toISOString());
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: 'The sheet could not be updated: ' + (err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

/** Rewrites one tab with the app's table. A new tab is placed in the app's order and styled once. */
function writeTable(ss, t, index) {
  let sh = ss.getSheetByName(t.name);
  const fresh = !sh;
  if (fresh) sh = ss.insertSheet(t.name, Math.min(index, ss.getNumSheets()));

  const width = t.header.length;
  const data = [t.header].concat(t.rows).map(function (r) {
    const row = [];
    for (let c = 0; c < width; c++) row.push(clean(r[c]));
    return row;
  });

  if (sh.getMaxRows() < data.length + 1) sh.insertRowsAfter(sh.getMaxRows(), data.length + 1 - sh.getMaxRows());
  if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
  const used = Math.max(width, sh.getLastColumn());
  sh.getRange(1, 1, sh.getMaxRows(), used).clearContent();
  sh.getRange(1, 1, data.length, width).setValues(data);

  if (fresh) {
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, width).setFontWeight('bold').setBackground(HEADER_COLOR);
    sh.autoResizeColumns(1, width);
    for (let c = 1; c <= width; c++) if (sh.getColumnWidth(c) > 320) sh.setColumnWidth(c, 320);
  }
}

/** Text the sheet would read as a formula is kept as plain text. */
function clean(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' && /^[=+@]/.test(v)) return "'" + v;
  return v;
}

/** One row per day (today's is replaced on every update), newest first, oldest beyond BACKUP_DAYS dropped. */
function writeBackup(ss, backup, savedAt) {
  let sh = ss.getSheetByName(BACKUP_TAB);
  if (!sh) {
    sh = ss.insertSheet(BACKUP_TAB, ss.getNumSheets());
    sh.getRange(1, 1, 1, 4).setValues([['Day', 'Saved at', 'Size (KB)', 'Data (continues to the right)']]).setFontWeight('bold').setBackground(HEADER_COLOR);
    sh.setFrozenRows(1);
  }
  const parts = [];
  for (let i = 0; i < backup.json.length; i += PART) parts.push(backup.json.slice(i, i + PART));
  const row = [backup.day, savedAt || new Date().toISOString(), Math.round(backup.json.length / 1024)].concat(parts);

  if (sh.getMaxColumns() < row.length) sh.insertColumnsAfter(sh.getMaxColumns(), row.length - sh.getMaxColumns());
  const days = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().map(function (r) { return r[0]; }) : [];
  let at = days.indexOf(backup.day);
  if (at === -1) {
    sh.insertRowBefore(2);
    at = 0;
  }
  const r = at + 2;
  sh.getRange(r, 1, 1, sh.getMaxColumns()).clearContent();
  // Plain text, so no part of the data is ever read as a number, date or formula.
  sh.getRange(r, 1, 1, row.length).setNumberFormat('@').setValues([row]).setWrap(false);

  const keep = BACKUP_DAYS + 1;
  if (sh.getLastRow() > keep) sh.deleteRows(keep + 1, sh.getLastRow() - keep);
}

// ── Restoring a backup ──

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Journey Tracker').addItem('Save a backup file to Google Drive…', 'saveBackupToDrive').addToUi();
}

/**
 * Joins one day's backup into a .json file in your Google Drive. Download it,
 * then in the app: Settings → Data → Import backup (study), and the import
 * button on the Personal or Time page (personal tasks and time log).
 */
function saveBackupToDrive() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BACKUP_TAB);
  if (!sh || sh.getLastRow() < 2) return ui.alert('There is no backup yet. It appears after the app’s first update.');
  const days = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().map(function (r) { return r[0]; });
  const answer = ui.prompt('Save a backup', 'Which day? (YYYY-MM-DD). Leave empty for the latest: ' + days[0] + '\nAvailable: ' + days.slice(0, 10).join(', ') + (days.length > 10 ? ', …' : ''), ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  const day = answer.getResponseText().trim() || days[0];
  const at = days.indexOf(day);
  if (at === -1) return ui.alert('No backup for ' + day + '.');
  const values = sh.getRange(at + 2, 4, 1, sh.getLastColumn() - 3).getValues()[0];
  const json = values.filter(function (v) { return v !== ''; }).join('');
  try {
    JSON.parse(json);
  } catch (err) {
    return ui.alert('That backup looks damaged and could not be read.');
  }
  const file = DriveApp.createFile('journey-backup-' + day + '.json', json, 'application/json');
  ui.alert('Saved to your Google Drive:\n' + file.getName() + '\n\n' + file.getUrl());
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
