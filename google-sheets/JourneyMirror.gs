/**
 * Journey Tracker ⇄ Google Sheet.
 *
 * Paste this whole file into the sheet's Extensions → Apps Script, set SECRET
 * to the secret key shown in the app (Settings → Google Sheet mirror), then
 * Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Full steps: google-sheets/README.md.
 *
 * App → sheet: the app sends finished tables; this script writes them. Each update
 * rewrites the tabs the app owns (Summary, Daily, Items, …) and never touches a
 * tab you add yourself. Every update also keeps a daily backup for 60 days.
 *
 * Sheet → app: you log things in the ✎ tabs, or with the "Log now" / "Revise now"
 * dropdowns and the Done boxes. This script only collects them; the app (while
 * open) picks them up about once a minute, applies them with its own rules, and
 * reports back, so each entry shows ✓ or ✗ with the reason.
 */

const SECRET = 'PASTE-YOUR-SECRET-KEY-HERE';
const BACKUP_DAYS = 60;
const BACKUP_TAB = 'Backups';
/** Google Sheets allows 50,000 characters per cell; backups are split into parts below that. */
const PART = 45000;
const HEADER_COLOR = '#ede9fe';
/** Columns and tabs you write in are green, so they stand out from the read-only copy. */
const EDIT_COLOR = '#d1fae5';

/** Mirror columns you can change, by tab (names shared with the app's store/sheetInbox). */
const EDITABLE = { 'Items': ['Log now'], 'Revisions due': ['Revise now'], 'Personal tasks': ['Done'] };
const INPUT_TABS = ['✎ Study log', '✎ Study time', '✎ New task', '✎ Time slot', '✎ Weight'];
/** Added after your columns on every ✎ tab; the last three are hidden bookkeeping. */
const SYS_COLS = ['Status', 'ID', 'Claimed', 'Edited'];
const SYNC_LOG = 'Sync log';
const LOG_HEADER = ['When', 'Tab', 'What', 'Column', 'New value', 'Status', 'ID', 'Ref', 'Claimed'];
const LOG_KEEP = 300;
/** An entry handed to the app but never confirmed (app closed mid-way) is offered again after this. */
const CLAIM_MS = 3 * 60 * 1000;
/** A ✎ row edited this recently may still be half typed: it waits. */
const SETTLE_MS = 20 * 1000;
const WAITING = 'Waiting for the app…';
const SENDING = '⏳ Sending to the app…';

function doGet() {
  return reply({ ok: true, app: 'journey-mirror', version: 2, ready: SECRET !== 'PASTE-YOUR-SECRET-KEY-HERE' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'That was not a Journey Tracker request.' });
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (body.op === 'pull') return reply({ ok: true, entries: pull(ss) });
    if (body.op === 'ack') {
      ack(ss, body.results || []);
      return reply({ ok: true });
    }
    return mirror(ss, body);
  } catch (err) {
    return reply({ ok: false, error: 'The sheet could not be updated: ' + (err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

// ── App → sheet ──

function mirror(ss, body) {
  const props = PropertiesService.getScriptProperties();
  // Two devices can push at about the same time: never let an older copy replace a newer one.
  const last = props.getProperty('generatedAt') || '';
  if (body.generatedAt && body.generatedAt < last) return reply({ ok: true, skipped: true });

  (body.tables || []).forEach(function (t, i) {
    writeTable(ss, t, i);
  });
  if (body.inputs) {
    writeInputs(ss, body.inputs);
    props.setProperty('inputs', JSON.stringify(body.inputs.map(function (d) { return { name: d.name, header: d.header, dates: d.dates || [] }; })));
  }
  // Edits the app hasn't applied yet stay visible instead of being wiped by this rewrite.
  Object.keys(EDITABLE).forEach(function (tab) {
    const sh = ss.getSheetByName(tab);
    if (sh) reapplyPending(ss, sh, tab);
  });
  if (body.backup && body.backup.json) writeBackup(ss, body.backup, body.generatedAt);
  props.setProperty('generatedAt', body.generatedAt || new Date().toISOString());
  return reply({ ok: true });
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
  const all = sh.getRange(1, 1, sh.getMaxRows(), used);
  all.clearContent();
  all.clearDataValidations();
  sh.getRange(1, 1, data.length, width).setValues(data);

  const n = t.rows.length;
  const col = function (name) { return t.header.indexOf(name) + 1; };
  if (n > 0) {
    (t.checks || []).forEach(function (h) {
      if (col(h)) sh.getRange(2, col(h), n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    });
    Object.keys(t.choices || {}).forEach(function (h) {
      if (col(h) && t.choices[h].length) {
        sh.getRange(2, col(h), n, 1).setNumberFormat('@').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(t.choices[h], true).setAllowInvalid(false).build());
      }
    });
  }
  (t.editable || []).forEach(function (h) {
    if (col(h)) {
      sh.getRange(1, col(h)).setBackground(EDIT_COLOR).setNote('You can change this column. The app applies it within a minute while it is open; the Sync log tab shows how it went.');
    }
  });
  (t.hidden || []).forEach(function (h) {
    if (col(h)) sh.hideColumns(col(h));
  });
  if (t.hideTab) sh.hideSheet();

  if (fresh) {
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, width).setFontWeight('bold');
    for (let c = 1; c <= width; c++) if ((t.editable || []).indexOf(t.header[c - 1]) === -1) sh.getRange(1, c).setBackground(HEADER_COLOR);
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

/** The ✎ tabs. Created once; after that only the header, notes and dropdowns are refreshed — never your rows. */
function writeInputs(ss, inputs) {
  inputs.forEach(function (def, i) {
    let sh = ss.getSheetByName(def.name);
    const fresh = !sh;
    if (fresh) sh = ss.insertSheet(def.name, Math.min(1 + i, ss.getNumSheets()));
    const header = def.header.concat(SYS_COLS);
    if (sh.getMaxColumns() < header.length) sh.insertColumnsAfter(sh.getMaxColumns(), header.length - sh.getMaxColumns());
    if (sh.getMaxRows() < 201) sh.insertRowsAfter(sh.getMaxRows(), 201 - sh.getMaxRows());
    const rows = sh.getMaxRows() - 1;

    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground(EDIT_COLOR);
    sh.getRange(1, def.header.length + 1).setBackground(HEADER_COLOR).setNote('Filled in by the app: ✓ applied, or ✗ and why not. Fix the row and it is tried again.');
    def.header.forEach(function (h, k) {
      const c = k + 1;
      const range = sh.getRange(2, c, rows, 1);
      sh.getRange(1, c).setNote(def.notes && def.notes[h] ? def.notes[h] : '');
      let rule = null;
      if (def.choices && def.choices[h] && def.choices[h].length) {
        range.setNumberFormat('@');
        rule = SpreadsheetApp.newDataValidation().requireValueInList(def.choices[h], true).setAllowInvalid(false);
      } else if (def.ranges && def.ranges[h]) {
        rule = SpreadsheetApp.newDataValidation().requireValueInRange(ss.getRange(def.ranges[h]), true).setAllowInvalid(false);
      } else if (def.checks && def.checks.indexOf(h) !== -1) {
        rule = SpreadsheetApp.newDataValidation().requireCheckbox();
      } else if (def.dates && def.dates.indexOf(h) !== -1) {
        range.setNumberFormat('yyyy-mm-dd');
        rule = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false);
      } else if (def.numbers && def.numbers[h]) {
        rule = SpreadsheetApp.newDataValidation().requireNumberBetween(def.numbers[h][0], def.numbers[h][1]).setAllowInvalid(false);
      }
      if (rule) range.setDataValidation(rule.build());
      else range.clearDataValidations();
    });
    const st = def.header.length + 1;
    sh.hideColumns(st + 1, 3);
    if (fresh) {
      sh.setFrozenRows(1);
      for (let c = 1; c <= def.header.length; c++) sh.setColumnWidth(c, def.header[c - 1] === 'Item' || def.header[c - 1] === 'Task' ? 300 : 140);
      sh.setColumnWidth(st, 280);
      sh.getRange(2, st, rows, 1).setFontColor('#6b7280').setFontStyle('italic');
    }
  });
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

// ── Sheet → app ──

/** Runs on every edit you make (a simple trigger: no setup needed). */
function onEdit(e) {
  if (!e || !e.range || e.range.getRow() < 2) return;
  const sh = e.range.getSheet();
  const name = sh.getName();
  if (INPUT_TABS.indexOf(name) !== -1) return touchInputRows(sh, e.range);
  const cols = EDITABLE[name];
  if (!cols) return;

  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const idCol = header.indexOf('ID');
  if (idCol < 0) return;
  const r0 = e.range.getRow();
  const c0 = e.range.getColumn();
  const nr = e.range.getNumRows();
  const values = e.range.getValues();
  const ids = sh.getRange(r0, idCol + 1, nr, 1).getValues();
  const titleCol = header.indexOf(name === 'Revisions due' ? 'Item' : 'Title');
  const titles = titleCol >= 0 ? sh.getRange(r0, titleCol + 1, nr, 1).getValues() : null;
  const log = syncLog(e.source || SpreadsheetApp.getActiveSpreadsheet());
  for (let i = 0; i < nr; i++) {
    for (let j = 0; j < values[i].length; j++) {
      const col = header[c0 - 1 + j];
      if (cols.indexOf(col) === -1 || !ids[i][0]) continue;
      log.appendRow([new Date(), name, titles ? titles[i][0] : '', col, values[i][j], WAITING, Utilities.getUuid(), String(ids[i][0]), '']);
    }
  }
}

/** Editing a ✎ row: note when (so a half-typed row waits), and retry a row that failed. */
function touchInputRows(sh, range) {
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const st = header.indexOf('Status');
  if (st < 0 || range.getColumn() > st) return;
  const now = new Date();
  for (let r = range.getRow(); r < range.getRow() + range.getNumRows(); r++) {
    const status = String(sh.getRange(r, st + 1).getValue());
    if (status.indexOf('✗') === 0) sh.getRange(r, st + 1).setValue('').setFontColor('#6b7280');
    sh.getRange(r, st + 4).setValue(now);
  }
}

function syncLog(ss) {
  let sh = ss.getSheetByName(SYNC_LOG);
  if (!sh) {
    sh = ss.insertSheet(SYNC_LOG, ss.getNumSheets());
    sh.getRange(1, 1, 1, LOG_HEADER.length).setValues([LOG_HEADER]).setFontWeight('bold').setBackground(HEADER_COLOR);
    sh.setFrozenRows(1);
    sh.hideColumns(7, 3);
    sh.setColumnWidth(3, 260);
    sh.setColumnWidth(6, 320);
  }
  return sh;
}

/** Hands the app what is waiting, and marks it as on its way. */
function pull(ss) {
  const now = Date.now();
  const tz = ss.getSpreadsheetTimeZone();
  const out = [];
  const offered = function (status, claimed) {
    const s = String(status);
    if (s === '' || s === WAITING) return true;
    return s.indexOf('⏳') === 0 && now - (claimed ? new Date(claimed).getTime() : 0) > CLAIM_MS;
  };

  const log = ss.getSheetByName(SYNC_LOG);
  if (log && log.getLastRow() > 1) {
    const data = log.getRange(2, 1, log.getLastRow() - 1, LOG_HEADER.length).getValues();
    data.forEach(function (r, i) {
      if (!offered(r[5], r[8])) return;
      out.push({ id: String(r[6]), source: 'cell', tab: String(r[1]), ref: String(r[7]), column: String(r[3]), value: r[4] });
      log.getRange(i + 2, 6).setValue(SENDING);
      log.getRange(i + 2, 9).setValue(new Date(now));
    });
  }

  const defs = JSON.parse(PropertiesService.getScriptProperties().getProperty('inputs') || '[]');
  defs.forEach(function (def) {
    const sh = ss.getSheetByName(def.name);
    if (!sh || sh.getLastRow() < 2) return;
    const st = def.header.length;
    const data = sh.getRange(2, 1, sh.getLastRow() - 1, st + SYS_COLS.length).getValues();
    data.forEach(function (r, i) {
      const user = r.slice(0, st);
      if (user.every(function (v) { return v === '' || v === false; })) return;
      if (!offered(r[st], r[st + 2])) return;
      const edited = r[st + 3] ? new Date(r[st + 3]).getTime() : 0;
      if (edited && now - edited < SETTLE_MS) return;
      let id = r[st + 1];
      if (!id) {
        id = Utilities.getUuid();
        sh.getRange(i + 2, st + 2).setValue(id);
      }
      const values = {};
      def.header.forEach(function (h, k) {
        values[h] = serialise(r[k], def.dates.indexOf(h) !== -1, tz);
      });
      out.push({ id: String(id), source: 'input', tab: def.name, values: values });
      sh.getRange(i + 2, st + 1).setValue(SENDING).setFontColor('#6b7280');
      sh.getRange(i + 2, st + 3).setValue(new Date(now));
    });
  });
  return out;
}

function serialise(v, isDate, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, isDate ? 'yyyy-MM-dd' : 'HH:mm');
  return v;
}

/** The app's report: ✓ or ✗ (with the reason) next to each entry. */
function ack(ss, results) {
  const byId = {};
  results.forEach(function (r) { byId[r.id] = r; });
  const stamp = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'd MMM HH:mm');
  const label = function (r) { return r.ok ? '✓ ' + (r.message || 'Applied') + ' · ' + stamp : '✗ ' + (r.message || 'Could not be applied'); };
  const color = function (r) { return r.ok ? '#047857' : '#be123c'; };

  const log = ss.getSheetByName(SYNC_LOG);
  if (log && log.getLastRow() > 1) {
    const ids = log.getRange(2, 7, log.getLastRow() - 1, 1).getValues();
    ids.forEach(function (row, i) {
      const r = byId[String(row[0])];
      if (r) log.getRange(i + 2, 6).setValue(label(r)).setFontColor(color(r));
    });
    const extra = log.getLastRow() - 1 - LOG_KEEP;
    if (extra > 0) log.deleteRows(2, extra);
  }

  const defs = JSON.parse(PropertiesService.getScriptProperties().getProperty('inputs') || '[]');
  defs.forEach(function (def) {
    const sh = ss.getSheetByName(def.name);
    if (!sh || sh.getLastRow() < 2) return;
    const st = def.header.length;
    const ids = sh.getRange(2, st + 2, sh.getLastRow() - 1, 1).getValues();
    ids.forEach(function (row, i) {
      const r = byId[String(row[0])];
      if (r) sh.getRange(i + 2, st + 1).setValue(label(r)).setFontColor(color(r)).setFontStyle('normal');
    });
  });
}

/** After a rewrite, put back edits that are still on their way to the app. */
function reapplyPending(ss, sh, tab) {
  const log = ss.getSheetByName(SYNC_LOG);
  if (!log || log.getLastRow() < 2 || sh.getLastRow() < 2) return;
  const pending = log.getRange(2, 1, log.getLastRow() - 1, LOG_HEADER.length).getValues().filter(function (r) {
    return r[1] === tab && (r[5] === WAITING || String(r[5]).indexOf('⏳') === 0);
  });
  if (!pending.length) return;
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const idCol = header.indexOf('ID');
  if (idCol < 0) return;
  const ids = sh.getRange(2, idCol + 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); });
  pending.forEach(function (p) {
    const row = ids.indexOf(String(p[7]));
    const col = header.indexOf(p[3]);
    if (row !== -1 && col !== -1) sh.getRange(row + 2, col + 1).setValue(p[4]);
  });
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
