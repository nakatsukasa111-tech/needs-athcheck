/**
 * NeeDS フィジカルチェック API (Google Apps Script)
 * ------------------------------------------------------------------
 * 役割
 *   - 会員マスタ / 測定ログ / 閾値マスタ を1つのスプレッドシートで管理する
 *   - アプリからの読み出し(doGet)と保存(doPost)を受ける
 *
 * 使い方は別紙の手順書を参照。まず setupSheets() を1回だけ実行すること。
 */

// ============================================================
// 設定
// ============================================================

// アプリと共有する合言葉。必ず別の文字列に変更すること。
// アプリ側にも同じ文字列を書き込む。
var ACCESS_TOKEN = 'CHANGE_ME_NeeDS_2026';

var SHEET_MEMBERS      = 'members';
var SHEET_MEASUREMENTS = 'measurements';
var SHEET_THRESHOLDS   = 'thresholds';
var SHEET_RULES        = 'rules';

// 会員マスタの列
var MEMBER_COLUMNS = [
  'member_id', 'name', 'kana', 'sex', 'birth_date', 'sport', 'registered_at', 'note'
];

// 測定ログの列（この順序がそのままシートの列になる）
var MEASUREMENT_COLUMNS = [
  // --- メタ情報 ---
  'measurement_id', 'member_id', 'measured_at', 'session_no',
  'age', 'age_band', 'height', 'weight', 'body_fat', 'lbm',
  'injury', 'estimated_items', 'trainer', 'note',

  // --- 柔軟性 15項目（0〜3点） ---
  'banzai_R', 'banzai_L', 'kettai_R', 'kettai_L', 'shoulder_er_R', 'shoulder_er_L',
  'trunk_rot_R', 'trunk_rot_L', 'trunk_side_R', 'trunk_side_L', 'bridge',
  'split', 'aslr_R', 'aslr_L', 'ground_touch_flex',

  // --- バランス 4項目 ---
  'sl_stance_R', 'sl_stance_L', 'ground_touch_bal_R', 'ground_touch_bal_L',

  // --- 筋力 9項目 ---
  'ab30s', 'chinup', 'sq_1rm', 'bp_1rm', 'dl_1rm', 'pushup',
  'sl_sq_R', 'sl_sq_L', 'pl_basic',

  // --- ジャンプ 7項目 ---
  'sqj', 'cmj', 'abj', 'sl_cmj_R', 'sl_cmj_L', 'hop_rsi', 'drop_rsi',

  // --- 動きの質 5項目（0〜3点） ---
  'sq_quality', 'slide_sq', 'rot_sq', 'rot_drill_up', 'rot_drill_low',

  // --- アプリが計算して送ってくるスコア（表示当時の記録として保存） ---
  'score_flex', 'score_balance', 'score_strength', 'score_jump', 'score_quality',
  'score_total', 'risk_flags'
];

// ジュニア／大人の境界（rules シートに同じ値があればそちらを優先）
var DEFAULT_AGE_BORDER = 17;


// ============================================================
// 初回セットアップ（エディタから1回だけ手動実行する）
// ============================================================

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  createSheetIfMissing_(ss, SHEET_MEMBERS, MEMBER_COLUMNS);
  createSheetIfMissing_(ss, SHEET_MEASUREMENTS, MEASUREMENT_COLUMNS);

  var msg = 'members と measurements を用意しました。\n'
          + 'thresholds と rules は閾値マスタのxlsxから取り込んでください。';
  Logger.log(msg);
  return msg;
}

function createSheetIfMissing_(ss, name, columns) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, columns.length).setValues([columns]);
    sh.getRange(1, 1, 1, columns.length)
      .setFontWeight('bold')
      .setBackground('#1f3864')
      .setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
}


// ============================================================
// 読み出し（GET）
// ============================================================

/**
 * action=bootstrap        閾値とルールを返す（アプリ起動時に1回）
 * action=searchMembers    q= の部分一致で会員候補を返す
 * action=history          member_id= の過去測定を古い順に返す
 */
function doGet(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    if (p.token !== ACCESS_TOKEN) {
      return jsonOut_({ ok: false, error: 'unauthorized' });
    }

    switch (p.action) {
      case 'bootstrap':
        return jsonOut_({
          ok: true,
          thresholds: readSheetAsObjects_(SHEET_THRESHOLDS),
          rules: readSheetAsObjects_(SHEET_RULES)
        });

      case 'searchMembers':
        return jsonOut_({ ok: true, members: searchMembers_(p.q || '') });

      case 'history':
        if (!p.member_id) return jsonOut_({ ok: false, error: 'member_id required' });
        return jsonOut_({
          ok: true,
          member: findMemberById_(p.member_id),
          measurements: getHistory_(p.member_id)
        });

      default:
        return jsonOut_({ ok: false, error: 'unknown action' });
    }
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}


// ============================================================
// 保存（POST）
// ============================================================

/**
 * body は JSON文字列。Content-Type は text/plain で送ること（CORS対策）。
 *
 * { token:'...', action:'createMember',    member:{...} }
 * { token:'...', action:'saveMeasurement', measurement:{...} }
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    var body = JSON.parse(e.postData.contents);
    if (body.token !== ACCESS_TOKEN) {
      return jsonOut_({ ok: false, error: 'unauthorized' });
    }

    if (body.action === 'createMember') {
      return jsonOut_({ ok: true, member: createMember_(body.member || {}) });
    }
    if (body.action === 'saveMeasurement') {
      return jsonOut_({ ok: true, measurement: saveMeasurement_(body.measurement || {}) });
    }
    return jsonOut_({ ok: false, error: 'unknown action' });

  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}


// ============================================================
// 会員
// ============================================================

function createMember_(m) {
  var sh = sheet_(SHEET_MEMBERS);
  var id = nextMemberId_(sh);
  var now = new Date();

  var row = {
    member_id:     id,
    name:          m.name || '',
    kana:          m.kana || '',
    sex:           m.sex || '',            // 'M' または 'F'
    birth_date:    m.birth_date || '',     // 'YYYY-MM-DD'
    sport:         m.sport || '',
    registered_at: Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd'),
    note:          m.note || ''
  };

  sh.appendRow(MEMBER_COLUMNS.map(function (k) { return row[k]; }));
  return row;
}

function nextMemberId_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 'NDS0001';

  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  var max = 0;
  for (var i = 0; i < ids.length; i++) {
    var n = parseInt(String(ids[i][0]).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return 'NDS' + ('0000' + (max + 1)).slice(-4);
}

function searchMembers_(q) {
  var rows = readSheetAsObjects_(SHEET_MEMBERS);
  if (!q) return rows.slice(0, 50);

  var key = String(q).toLowerCase();
  return rows.filter(function (r) {
    return String(r.name).toLowerCase().indexOf(key) >= 0
        || String(r.kana).toLowerCase().indexOf(key) >= 0
        || String(r.member_id).toLowerCase().indexOf(key) >= 0;
  }).slice(0, 50);
}

function findMemberById_(id) {
  var rows = readSheetAsObjects_(SHEET_MEMBERS);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].member_id) === String(id)) return rows[i];
  }
  return null;
}


// ============================================================
// 測定
// ============================================================

function saveMeasurement_(d) {
  var sh = sheet_(SHEET_MEASUREMENTS);
  var member = findMemberById_(d.member_id);
  if (!member) throw new Error('member not found: ' + d.member_id);

  var measuredAt = d.measured_at
    || Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

  // 年齢と年齢区分はサーバ側で確定させる（アプリ側の計算違いを防ぐ）
  var age = calcAge_(member.birth_date, measuredAt);
  var border = getRuleValue_('age_band_border', DEFAULT_AGE_BORDER);

  var row = {};
  MEASUREMENT_COLUMNS.forEach(function (k) {
    row[k] = (d[k] === undefined || d[k] === null) ? '' : d[k];
  });

  row.measurement_id = Utilities.getUuid().slice(0, 8);
  row.member_id      = d.member_id;
  row.measured_at    = measuredAt;
  row.session_no     = countSessions_(d.member_id) + 1;
  row.age            = (age === null ? '' : age);
  row.age_band       = (age === null) ? '' : (age >= border ? 'adult' : 'junior');

  // 除脂肪体重は自動計算
  if (row.weight !== '' && row.body_fat !== '') {
    row.lbm = Math.round(Number(row.weight) * (1 - Number(row.body_fat) / 100) * 10) / 10;
  }

  // 推定値・左右差フラグは配列で来ても文字列に整形して保存
  if (Object.prototype.toString.call(row.estimated_items) === '[object Array]') {
    row.estimated_items = row.estimated_items.join(',');
  }
  if (Object.prototype.toString.call(row.risk_flags) === '[object Array]') {
    row.risk_flags = row.risk_flags.join(',');
  }

  sh.appendRow(MEASUREMENT_COLUMNS.map(function (k) { return row[k]; }));
  return row;
}

function countSessions_(memberId) {
  var sh = sheet_(SHEET_MEASUREMENTS);
  var last = sh.getLastRow();
  if (last < 2) return 0;

  var col = MEASUREMENT_COLUMNS.indexOf('member_id') + 1;
  var ids = sh.getRange(2, col, last - 1, 1).getValues();
  var n = 0;
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(memberId)) n++;
  }
  return n;
}

function getHistory_(memberId) {
  var rows = readSheetAsObjects_(SHEET_MEASUREMENTS);
  return rows.filter(function (r) {
    return String(r.member_id) === String(memberId);
  }).sort(function (a, b) {
    return Number(a.session_no) - Number(b.session_no);
  });
}

function calcAge_(birthDate, onDate) {
  if (!birthDate) return null;
  var b = new Date(birthDate);
  var d = new Date(onDate);
  if (isNaN(b.getTime()) || isNaN(d.getTime())) return null;

  var age = d.getFullYear() - b.getFullYear();
  var m = d.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && d.getDate() < b.getDate())) age--;
  return age;
}


// ============================================================
// 共通ヘルパー
// ============================================================

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('sheet not found: ' + name + ' / setupSheets() を先に実行してください');
  return sh;
}

/** シートを { 列名: 値 } の配列にして返す。空行は除外する。 */
function readSheetAsObjects_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) return [];

  var last = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (last < 2 || lastCol < 1) return [];

  var values = sh.getRange(1, 1, last, lastCol).getValues();
  var header = values[0];
  var out = [];

  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (String(r[0]).length === 0) continue;  // 凡例行などを除外

    var o = {};
    for (var c = 0; c < header.length; c++) {
      var key = String(header[c]).trim();
      if (!key) continue;
      var v = r[c];
      if (v instanceof Date) {
        v = Utilities.formatDate(v, 'Asia/Tokyo', 'yyyy-MM-dd');
      }
      o[key] = v;
    }
    out.push(o);
  }
  return out;
}

function getRuleValue_(key, fallback) {
  var rows = readSheetAsObjects_(SHEET_RULES);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].rule_key) === key) {
      var v = Number(rows[i].value);
      if (!isNaN(v)) return v;
    }
  }
  return fallback;
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


// ============================================================
// 動作確認用（エディタから実行してログを見る）
// ============================================================

function testAll() {
  Logger.log('--- 閾値の件数 ---');
  Logger.log(readSheetAsObjects_(SHEET_THRESHOLDS).length);

  Logger.log('--- ルールの件数 ---');
  Logger.log(readSheetAsObjects_(SHEET_RULES).length);

  Logger.log('--- テスト会員を作成 ---');
  var m = createMember_({
    name: 'テスト太郎', kana: 'てすとたろう',
    sex: 'M', birth_date: '2008-04-01', sport: '野球'
  });
  Logger.log(m);

  Logger.log('--- テスト測定を保存 ---');
  Logger.log(saveMeasurement_({
    member_id: m.member_id,
    measured_at: '2026-09-10',
    height: 172, weight: 65, body_fat: 12,
    cmj: 42, abj: 47, sqj: 36,
    bp_1rm: 60, sq_1rm: 90,
    estimated_items: ['sq_1rm']
  }));

  Logger.log('--- 履歴の取得 ---');
  Logger.log(getHistory_(m.member_id));
}
