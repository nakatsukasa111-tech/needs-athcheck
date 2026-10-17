import test from 'node:test';
import assert from 'node:assert/strict';
import {createAthleteScorer} from '../src/domain/athlete-scoring.mjs';
import {loadLegacy,masters} from './helpers.mjs';
import {renderConnection,renderGolfFigure} from '../src/domain/quality-overlay.mjs';
import {measurementInput} from '../portal/lib/measurement-input.mjs';
const settings=masters(),scorer=createAthleteScorer(settings);
test('SSP伸展・屈曲を独立保存し、未測定は過去評価の分母に加えない',()=>{
 const old=scorer.score({sq_quality:2});assert.equal(old.cats.quality,66.7);
 assert.equal(old.qualityLinks.filter(l=>l.key.startsWith('ssp')).length,0);
 const f=new FormData();Object.entries({measured_on:'2026-10-17','value:pelvic_tilt':2,'value:scapula_motion':3,'value:ssp_extension':3,'value:ssp_flexion':1}).forEach(([k,v])=>f.set(k,v));
 const row=measurementInput(f,{birth_date:'1990-01-01',threshold_sex:'M'},settings);
 assert.deepEqual(row.values,{pelvic_tilt:2,scapula_motion:3,ssp_extension:3,ssp_flexion:1});
 assert.equal(row.saved_score.cats.quality,75);
 const links=row.saved_score.qualityLinks;assert.equal(links.find(l=>l.key==='ssp_extension').lv,'green');assert.equal(links.find(l=>l.key==='ssp_flexion').lv,'red');
 for(const bad of ['0','4','1.5']){f.set('value:ssp_extension',bad);assert.throws(()=>measurementInput(f,{birth_date:'1990-01-01',threshold_sex:'M'},settings));}
});
test('左右差・静動比較は両方必要で、両側低評価を良好にしない',()=>{
 assert.ok(!scorer.score({aslr_R:3}).qualityLinks.some(l=>l.key==='pair_aslr'));
 assert.equal(scorer.score({aslr_R:1,aslr_L:1}).qualityLinks.find(l=>l.key==='pair_aslr').lv,'red');
 const jump=scorer.score({sl_cmj_R:60,sl_cmj_L:40},{sex:'M',band:'adult'});assert.equal(jump.qualityLinks.find(l=>l.key==='pair_sl_cmj').lv,'red');
 assert.ok(!scorer.score({sl_stance_R:60},{sex:'M',band:'adult'}).qualityLinks.some(l=>l.key==='static_dynamic_R'));
 const d=scorer.score({sl_stance_R:60,ground_touch_bal_R:20},{sex:'M',band:'adult'});assert.ok(d.qualityLinks.find(l=>l.key==='static_dynamic_R'));
});
test('旧APIの既存note欄を介して新4項目を欠損なく復元できる',()=>{
 const old=loadLegacy();const values={pelvic_tilt:2,scapula_motion:3,ssp_extension:1,ssp_flexion:2};
 const note=old.packQualityValues(values);const row=old.unpackQualityRecord({note,cmj:30});for(const[k,v]of Object.entries(values))assert.equal(row[k],v);assert.equal(row.cmj,30);
 assert.equal(old.unpackQualityRecord({note:'通常のメモ'}).ssp_extension,undefined);
 assert.equal(old.unpackQualityRecord({note:JSON.stringify({schema:'needs-quality-v2',values:{ssp_extension:100}})}).ssp_extension,undefined);
});
test('選択したSSPを全姿勢へ同じ色で反映し、伸展と屈曲を区別する',()=>{
 const d=scorer.score({ssp_extension:3,ssp_flexion:1});const ext=d.qualityLinks[0],flex=d.qualityLinks[1];
 for(const pose of ['standing','address','impact','follow'])for(const view of ['front','back']){
  assert.ok(renderConnection(ext,pose,view).includes('#12B76A'));assert.ok(renderConnection(flex,pose,view).includes('#F04438'));assert.notEqual(renderConnection(ext,pose,view),renderConnection(flex,pose,view));
 }
 assert.ok(!renderGolfFigure('address','front',{}, {},'x',ext).includes('radialGradient'));
});
