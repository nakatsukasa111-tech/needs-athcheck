import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memberInput, measurementInput, dateValue } from '../lib/measurement-input.mjs';
import { masters } from '../../tests/helpers.mjs';
import { createAthleteScorer } from '../../src/domain/athlete-scoring.mjs';
const member={birth_date:'2009-10-17',threshold_sex:'F'};
const settings=masters();
function form(fields={}){const f=new FormData();for(const [k,v] of Object.entries({measured_on:'2026-10-17','value:split':'0',...fields}))f.set(k,v);return f;}
test('0点・小数・片側入力を保持し、空欄を未測定として保存する',()=>{
  const r=measurementInput(form({'value:cmj':'31.25','value:banzai_R':'2','value:banzai_L':''}),member,settings);
  assert.deepEqual(r.values,{banzai_R:2,split:0,cmj:31.25});assert.equal(r.published,false);
  assert.equal(r.threshold_sex,'F');assert.equal(r.age_band,'adult');
  assert.deepEqual(r.saved_score,createAthleteScorer(settings).score(r.values,{sex:'F',band:'adult',weight:undefined,est:{}}));
});
test('測定日の誕生日前後で年齢区分を計算する',()=>{
  assert.equal(measurementInput(form({measured_on:'2026-10-16'}),member,settings).age_band,'junior');
  assert.equal(measurementInput(form(),member,settings).age_band,'adult');
});
test('会社別の年齢境界設定を使う',()=>{
  assert.equal(measurementInput(form(),member,{...settings,rules:{age_band_border:18}}).age_band,'junior');
});
test('測定時の体重と推定フラグを保存する',()=>{
  const r=measurementInput(form({weight:'55.5','value:bp_1rm':'40.25','estimated:bp_1rm':'on'}),member,settings);
  assert.equal(r.weight,55.5);assert.deepEqual(r.estimated_items,['bp_1rm']);
  assert.throws(()=>measurementInput(form({'value:bp_1rm':'40'}),member,settings),/体重/);
});
test('点数の範囲外・非数・負数を拒否する',()=>{
  for(const v of ['4','-1','1.5','NaN'])assert.throws(()=>measurementInput(form({'value:split':v}),member,settings));
  for(const v of ['Infinity','-1','abc'])assert.throws(()=>measurementInput(form({'value:cmj':v}),member,settings));
});
test('全空欄・不正日・未来日・誕生日前の測定を拒否する',()=>{
  assert.throws(()=>measurementInput(form({'value:split':''}),member,settings),/1項目/);
  for(const day of ['2026-02-30','9999-01-01','2000-01-01'])assert.throws(()=>measurementInput(form({measured_on:day}),member,settings));
  assert.throws(()=>dateValue('2026-10-18','測定日','2026-10-17'));
});
test('未設定の会社基準では保存しない',()=>{
  assert.throws(()=>measurementInput(form(),member,null),/評価基準/);
  assert.throws(()=>measurementInput(form({'value:cmj':'30'}),member,{thresholds:{}}),/評価基準/);
});
test('投稿された会社・性別・採点結果・公開フラグを信用しない',()=>{
  const r=measurementInput(form({published:'true',threshold_sex:'M',saved_score:'{"total":100}',company_id:'other','value:unknown':'100','estimated:split':'on'}),member,settings);
  assert.equal(r.published,false);assert.equal(r.threshold_sex,'F');assert.equal(r.company_id,undefined);assert.equal(r.values.unknown,undefined);assert.deepEqual(r.estimated_items,[]);
});
test('会員の必須項目と公開コメントの長さを検証する',()=>{
  const f=new FormData();f.set('display_name',' 架空会員 ');f.set('birth_date','2000-01-01');f.set('threshold_sex','M');
  assert.equal(memberInput(f).display_name,'架空会員');f.set('threshold_sex','');assert.throws(()=>memberInput(f));
  assert.throws(()=>measurementInput(form({public_comment:'あ'.repeat(2001)}),member,settings));
});
