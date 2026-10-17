import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// 現行画面の計算を移植する。接続情報・DOM・通信処理は取り込まない。
const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8').replace(/\r\n/g, '\n');
function between(start, end) {
  const a = html.indexOf(start);
  const b = html.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`採点の抽出位置が見つかりません: ${start}`);
  return html.slice(a, b).trim();
}
const blocks = [
  between('var CATEGORY_WEIGHTS =', '/* ==================================================================\n   4. 状態'),
  between('function r1(n)', 'function toast(m)'),
  between('function rule(k, d)', '</script>'),
  between('function calcAge(birth', '</script>'),
];
const body = blocks.join('\n\n');
if (/DEFAULT_TOKEN|DEFAULT_API_URL|fetch\(|localStorage|document\./.test(body)) {
  throw new Error('採点以外の処理が含まれています');
}
const hash = createHash('sha256').update(body).digest('hex');
const output = `// tools/extract-scoring.mjs で生成。直接編集しないでください。
// 元の採点処理の SHA-256: ${hash}
// 現行画面はこのファイルへまだ切り替えていません。
export function createAthleteScorer({ thresholds = {}, rules = {}, tone = 'fact', weights } = {}) {
  // 会社ごとの設定を閉じ込め、別の呼び出しと混ざらないようにする。
  const TH = structuredClone(thresholds);
  const RULES = structuredClone(rules);
  const DISPLAY = { tone };
${body}
  if (weights) CATEGORY_WEIGHTS = { ...CATEGORY_WEIGHTS, ...weights };
  return Object.freeze({
    score(values, context = {}) {
      return computeScore(structuredClone(values), structuredClone(context));
    },
    ageOn: calcAge,
    ageBand: bandOf,
    pointOf,
    fields: Object.freeze([...FIELDS]),
    definitions: structuredClone(FIELD_DEF),
  });
}
`;
const target = new URL('src/domain/athlete-scoring.mjs', root);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== output) throw new Error('生成した採点処理が現行画面と一致しません');
  console.log('採点処理の同期: OK');
} else {
  mkdirSync(fileURLToPath(new URL('src/domain/', root)), { recursive: true });
  writeFileSync(target, output, 'utf8');
  console.log('採点処理を生成しました');
}
