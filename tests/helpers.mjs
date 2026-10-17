import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
export function loadLegacy() {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).filter(Boolean);
  const definitions = scripts.find(text => text.includes('var CATEGORY_WEIGHTS'));
  const scoring = scripts.find(text => text.includes('function computeScore('));
  if (!definitions || !scoring) throw new Error('現行の採点スクリプトが見つかりません');
  // 接続は行わない。設定読出しに使うブラウザ保存だけ空にする。
  const context = vm.createContext({ localStorage: { getItem() { return null; }, setItem() {} } });
  vm.runInContext(definitions, context);
  vm.runInContext(scoring, context);
  return context;
}

// 正のマスターCSVを読む。引用符・改行・二重引用符を含むセルにも対応。
function csv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(cell.replace(/\r$/, '')); cell = '';
      if (c === '\n') { rows.push(row); row = []; }
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  if (quoted) throw new Error('CSVの引用符が閉じられていません');
  return rows;
}
export function masters() {
  const thresholds = {};
  const rows = csv(readFileSync(new URL('docs/判定基準_マスター.csv', root), 'utf8'));
  for (const row of rows.slice(1)) {
    [['M', 'adult'], ['F', 'adult'], ['M', 'junior'], ['F', 'junior']].forEach(([sex, band], index) => {
      thresholds[`${row[0]}|${sex}|${band}`] = {
        red: Number(row[5 + index * 2]), green: Number(row[6 + index * 2]), direction: 'high',
      };
    });
  }
  const rules = Object.fromEntries(csv(readFileSync(new URL('docs/判定ルール_マスター.csv', root), 'utf8'))
    .slice(1).map(row => [row[0], Number(row[2])]));
  return { thresholds, rules };
}
export function plain(value) { return JSON.parse(JSON.stringify(value)); }
