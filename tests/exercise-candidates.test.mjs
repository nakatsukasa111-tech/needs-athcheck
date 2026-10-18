import test from 'node:test';
import assert from 'node:assert/strict';
import { proposeExerciseCandidates } from '../src/domain/exercise-candidates.mjs';

// 架空教材。実在する教材の適応・監修を示すものではない。
const lesson = (id, extra = {}) => ({ id, title: id, companyId: 'demo-a',
  tags: ['region:hip', 'goal:mobility'], reviewStatus: 'approved', memberVisible: true,
  kind: 'exercise', ...extra });
const rule = { id: 'demo-rule', companyId: 'demo-a', approved: true, enabled: true,
  field: 'split', maxInclusive: 1, requiredTags: ['region:hip', 'goal:mobility'],
  reason: '測定項目に対応する確認用候補', limit: 2 };
const propose = (values, extra = {}) => proposeExerciseCandidates({ companyId: 'demo-a',
  values, rules: [rule], catalog: [lesson('a'), lesson('b'), lesson('c')], ...extra });

test('条件に合う教材を最大2件、トレーナー確認待ちで出す', () => {
  const found = propose({ split: 1 });
  assert.deepEqual(found.map(x => x.lessonId), ['a', 'b']);
  assert.ok(found.every(x => x.status === 'candidate' && x.requiresTrainerApproval));
  assert.equal(found[0].reasons[0].field, 'split');
});
test('未測定・0点・不正値・条件外では候補を出さない', () => {
  for (const v of [undefined, null, '', 0, -1, NaN, Infinity, '1', 2, 3]) {
    assert.deepEqual(propose({ split: v }), []);
  }
});
test('他社・未監修・非公開・測定方法の教材を除外する', () => {
  const catalog = [lesson('other', { companyId: 'demo-b' }), lesson('draft', { reviewStatus: 'draft' }),
    lesson('private', { memberVisible: false }), lesson('protocol', { kind: 'measurement' }),
    lesson('wrong-tag', { tags: ['region:shoulder'] })];
  assert.deepEqual(propose({ split: 1 }, { catalog }), []);
});
test('他社のルール、未承認ルール、無効ルール、条件のないルールは使わない', () => {
  for (const extra of [{ companyId: 'demo-b' }, { approved: false }, { approved: 'false' }, { enabled: false }, { requiredTags: [] }]) {
    assert.deepEqual(propose({ split: 1 }, { rules: [{ ...rule, ...extra }] }), []);
  }
});
test('複数の測定に該当しても同じ教材はまとめ、根拠は残す', () => {
  const found = propose({ split: 1, aslr_R: 1 }, { rules: [rule, { ...rule, id: 'second', field: 'aslr_R' }] });
  assert.equal(found.length, 2);
  assert.equal(found[0].reasons.length, 2);
});
test('IDで指定でき、教材の表示名を変更しても対応は切れない', () => {
  const found = propose({ split: 1 }, { catalog: [lesson('a', { title: '新しい表示名' })],
    rules: [{ ...rule, lessonIds: ['a'] }] });
  assert.equal(found[0].lessonId, 'a');
  assert.equal(found[0].title, '新しい表示名');
});
test('教材IDの重複は、誤った教材を提示しないようエラーにする', () => {
  assert.throws(() => propose({ split: 1 }, { catalog: [lesson('a'), lesson('a')] }), /重複/);
});

test('recommendations are unique and globally capped at five, retaining all matching reasons',()=>{const catalog=Array.from({length:9},(_,i)=>lesson('lesson-'+i));const found=propose({split:1,aslr_R:1},{catalog,rules:[{...rule,limit:5},{...rule,id:'second',field:'aslr_R',limit:5}]});assert.equal(found.length,5);assert.equal(new Set(found.map(x=>x.lessonId)).size,5);assert.ok(found.every(x=>x.reasons.length===2));});
