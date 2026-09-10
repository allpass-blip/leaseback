// Bound to the existing 【イエトク】ユーザー管理シート. No Chatwork/mail calls.
const LEASEBACK_SPREADSHEET_ID = '1EQFmTO6gig3oSexkphOO5rMBACELFQjoIWa7PYNKMwA';
const LEASEBACK_SHEET_ID = 0;
const LEASEBACK_HEADERS = [
  'ステータス', '問い合わせ日時', '送信元', '物件種別', '都道府県', '市区町村',
  '売却希望時期', 'お名前', '電話番号', 'メールアドレス', '同意状況', '送信ページ', '備考'
];

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function targetSheet_() {
  const book = SpreadsheetApp.openById(LEASEBACK_SPREADSHEET_ID);
  const sheet = book.getSheets().find(function (item) {
    return item.getSheetId() === LEASEBACK_SHEET_ID;
  });
  if (!sheet) throw new Error('Target sheet is missing');
  const headers = sheet.getRange(1, 1, 1, 13).getDisplayValues()[0];
  if (!LEASEBACK_HEADERS.every(function (name, i) { return headers[i] === name; })) {
    throw new Error('Sheet headers have changed');
  }
  return sheet;
}

// Read-only configuration check. Never appends a row or sends a notification.
function checkConfiguration() {
  const sheet = targetSheet_();
  const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  if (!secret || secret.length < 32) throw new Error('Set WEBHOOK_SECRET (32+ characters)');
  console.log('Configuration OK: ' + sheet.getName() + '. No data written.');
}

function verifyEnvelope_(envelope, secret) {
  if (!secret || secret.length < 32 || !envelope ||
      typeof envelope.payload !== 'string' || envelope.payload.length > 30000 ||
      !Number.isSafeInteger(envelope.timestamp) ||
      Math.abs(Date.now() - envelope.timestamp) > 5 * 60 * 1000 ||
      !/^[a-f0-9]{64}$/.test(envelope.signature || '')) return false;
  const bytes = Utilities.computeHmacSha256Signature(
    String(envelope.timestamp) + '.' + envelope.payload, secret, Utilities.Charset.UTF_8);
  const expected = bytes.map(function (b) {
    return ('0' + ((b + 256) % 256).toString(16)).slice(-2);
  }).join('');
  let difference = 0;
  for (let i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ envelope.signature.charCodeAt(i);
  }
  return difference === 0;
}

function cellText_(value) {
  const text = typeof value === 'string' ? value.trim().slice(0, 2000) : '';
  // Prevent formulas and preserve phone numbers with their leading zero.
  return /^[=+@-]/.test(text) ? "'" + text : text;
}

function submissionRow_(submission) {
  if (!submission || !/^[a-zA-Z0-9_-]{1,128}$/.test(submission.id || '') ||
      typeof submission.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(submission.createdAt)) ||
      !submission.data || typeof submission.data !== 'object') {
    throw new Error('Invalid submission');
  }
  const data = submission.data;
  return [
    '未対応', new Date(submission.createdAt),
    cellText_(data['送信元']), cellText_(data['物件種別']),
    cellText_(data['都道府県']), cellText_(data['市区町村']),
    cellText_(data['売却希望時期']), cellText_(data['お名前']),
    cellText_(data['電話番号']), cellText_(data['メールアドレス']),
    cellText_(data['同意状況']), cellText_(data['送信ページ']), '', submission.id
  ];
}

function doPost(e) {
  let submission;
  let row;
  try {
    if (!e || !e.postData || e.postData.contents.length > 40000) {
      return json_({ ok: false, retryable: false });
    }
    const envelope = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    if (!verifyEnvelope_(envelope, secret)) return json_({ ok: false, retryable: false });
    submission = JSON.parse(envelope.payload);
    row = submissionRow_(submission);
  } catch (_) {
    return json_({ ok: false, retryable: false });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ ok: false, retryable: true });
  try {
    const sheet = targetSheet_();
    const idHeader = sheet.getRange(1, 14).getDisplayValues()[0][0];
    if (idHeader !== '' && idHeader !== '連携ID') {
      return json_({ ok: false, retryable: false });
    }
    const lastRow = sheet.getLastRow();
    if (!idHeader) {
      // Never claim a column that already has operational data or formulas.
      if (lastRow > 1 && sheet.getRange(2, 14, lastRow - 1, 1).getValues()
          .some(function (values) { return values[0] !== ''; })) {
        return json_({ ok: false, retryable: false });
      }
      sheet.getRange(1, 14).setValue('連携ID');
    }
    if (lastRow > 1 && sheet.getRange(2, 14, lastRow - 1, 1)
        .createTextFinder(submission.id).matchEntireCell(true).useRegularExpression(false)
        .findNext()) {
      return json_({ ok: true, duplicate: true });
    }
    const nextRow = lastRow + 1;
    if (nextRow > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
    // Existing records, statuses, notes and their order are preserved.
    const range = sheet.getRange(nextRow, 1, 1, 14);
    range.setNumberFormat('@');
    sheet.getRange(nextRow, 2).setNumberFormat('yyyy/mm/dd hh:mm');
    // ID and contact data are saved in one operation, so a retry can detect success.
    range.setValues([row]);
    SpreadsheetApp.flush();
    return json_({ ok: true });
  } catch (_) {
    return json_({ ok: false, retryable: true });
  } finally {
    lock.releaseLock();
  }
}

// Opening the deployment URL is always read-only and discloses no contact data.
function doGet() {
  return json_({ ok: true, service: 'leaseback-sheets', version: 1 });
}
