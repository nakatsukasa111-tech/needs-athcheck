import test from 'node:test';
import assert from 'node:assert/strict';
import { createAthleteScorer } from '../src/domain/athlete-scoring.mjs';
import { loadLegacy, masters, plain } from './helpers.mjs';

const config = masters();
const scorer = createAthleteScorer(config);

test('30種目・40入力欄を維持する', () => {
  assert.equal(scorer.fields.length, 40);
  assert.equal(new Set(Object.values(scorer.definitions).map(d => d.key)).size, 30);
  assert.equal(Object.keys(config.thresholds).length, 64);
});

test('0点は測定済み、空欄は採点対象外', () => {
  assert.equal(scorer.score({}).measured, 0);
  assert.equal(scorer.score({ split: 0 }).measured, 1);
  assert.equal(scorer.score({ split: 0 }).cats.flex, 0);
  assert.equal(scorer.score({ split: 3, bridge: '' }).cats.flex, 100);
});

test('柔軟性は左右の低い方を採用し、片側だけでも採点する', () => {
  assert.equal(scorer.score({ aslr_R: 3, aslr_L: 1 }).cats.flex, 33.3);
  assert.equal(scorer.score({ aslr_R: 3 }).cats.flex, 100);
  assert.ok(scorer.score({ aslr_R: 3, aslr_L: 1 }).flags.some(f => f.code === 'flex_lr_aslr'));
});

test('成人とジュニアは測定日の17歳の誕生日で切り替わる', () => {
  assert.equal(scorer.ageBand(scorer.ageOn('2009-10-17', '2026-10-16')), 'junior');
  assert.equal(scorer.ageBand(scorer.ageOn('2009-10-17', '2026-10-17')), 'adult');
});

test('64基準それぞれの赤上限・緑下限とその直前直後', () => {
  for (const [key, th] of Object.entries(config.thresholds)) {
    const [item, sex, band] = key.split('|');
    const context = { sex, band };
    assert.equal(scorer.pointOf(item, th.red, context), 1, key);
    assert.equal(scorer.pointOf(item, th.red + 0.0001, context), 2, key);
    assert.equal(scorer.pointOf(item, th.green - 0.0001, context), 2, key);
    assert.equal(scorer.pointOf(item, th.green, context), 3, key);
  }
});

test('1RMは体重必須、推定は結果に印を残す', () => {
  assert.equal(scorer.score({ bp_1rm: 100 }).cats.strength, undefined);
  const result = scorer.score({ bp_1rm: 100 }, { weight: 50, est: { bp_1rm: true } });
  assert.equal(result.cats.strength, 100);
  assert.match(result.items[0].val, /推定/);
  assert.match(result.items[0].val, /2\.00/);
});

test('ジャンプ分析とボディマップの根拠を残す', () => {
  const result = scorer.score({ sqj: 30, cmj: 33, abj: 36, sl_cmj_R: 10, sl_cmj_L: 16.5, hop_rsi: 2, drop_rsi: 3 });
  assert.equal(result.jump.ssc.rate, 10);
  assert.equal(result.jump.arm.rate, 9.1);
  assert.equal(result.jump.sl.target, 16.5);
  assert.ok(result.flags.some(f => f.code === 'asym_sl_cmj'));
  assert.ok(result.flags.some(f => f.code === 'rsi_diff'));
  assert.ok(result.body.balance.basis['thigh_front|R'].length > 0);
});

test('設定と呼び出し元の値を変更せず、会社間で基準が混ざらない', () => {
  const local = structuredClone(config);
  const a = createAthleteScorer(local);
  local.thresholds['cmj|M|adult'].green = 999;
  const b = createAthleteScorer(local);
  const input = { cmj: 50 }; const context = {};
  assert.equal(a.score(input, context).cats.jump, 100);
  assert.equal(b.score(input, context).cats.jump, 66.7);
  assert.deepEqual(context, {});
  assert.deepEqual(input, { cmj: 50 });
});

test('過去の実測値も変更後の基準で再計算できる', () => {
  const updated = structuredClone(config);
  updated.thresholds['cmj|M|adult'].green = 60;
  assert.equal(scorer.score({ cmj: 50 }).cats.jump, 100);
  assert.equal(createAthleteScorer(updated).score({ cmj: 50 }).cats.jump, 66.7);
});

for (const sex of ['M', 'F']) for (const band of ['adult', 'junior']) for (const tone of ['fact', 'growth']) {
  test(`現行画面との一致: ${sex}/${band}/${tone}・100パターン`, () => {
    const old = loadLegacy(); old.TH = structuredClone(config.thresholds); old.RULES = { ...config.rules };
    old.DISPLAY.tone = tone;
    const next = createAthleteScorer({ ...config, tone });
    let seed = 20261017;
    function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    for (let i = 0; i < 100; i++) {
      const values = {}, est = {};
      for (const field of next.fields) {
        const d = next.definitions[field];
        if (random() < 0.2) continue;
        values[field] = d.kind === 'pts' ? Math.floor(random() * 4) : Math.round(random() * 10000) / 100;
        if (d.est && random() < 0.5) est[field] = true;
      }
      const context = { sex, band, weight: i % 5 ? 70 : undefined, est };
      assert.deepEqual(plain(next.score(values, context)), plain(old.computeScore(values, context)), `パターン${i}`);
    }
  });
}
