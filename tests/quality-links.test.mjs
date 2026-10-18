import test from 'node:test';
import assert from 'node:assert/strict';
import {createAthleteScorer} from '../src/domain/athlete-scoring.mjs';
import {loadLegacy,masters} from './helpers.mjs';
import {renderQualityMarks,renderGolfFigure,renderSideFigure} from '../src/domain/quality-overlay.mjs';
import {measurementInput} from '../portal/lib/measurement-input.mjs';
const settings=masters(),scorer=createAthleteScorer(settings);
const values={slide_sq_R:1,slide_sq_L:3,rot_sq_R:2,rot_sq_L:3,rot_drill_up_R:1,rot_drill_up_L:2,rot_drill_low_R:3,rot_drill_low_L:1,scapula_motion_R:2,scapula_motion_L:3,pelvic_tilt_anterior:1,pelvic_tilt_posterior:3,ssp_extension:3,ssp_flexion:1};
test('全方向を独立保存し、未測定を分母に加えない',()=>{
 const f=new FormData();f.set('measured_on','2026-10-17');for(const[k,v]of Object.entries(values))f.set('value:'+k,v);
 const row=measurementInput(f,{birth_date:'1990-01-01',threshold_sex:'M'},settings);
 assert.deepEqual(row.values,values);assert.equal(row.saved_score.qualityAssessments.length,14);
 assert.equal(scorer.score({slide_sq_R:3}).cats.quality,100);
 for(const bad of ['0','4','1.5']){f.set('value:slide_sq_R',bad);assert.throws(()=>measurementInput(f,{birth_date:'1990-01-01',threshold_sex:'M'},settings));}
});
test('旧評価は得点を維持し、左右や前後へ複製しない',()=>{
 const old=scorer.score({sq_quality:2,slide_sq:1,rot_sq:3,rot_drill_up:2,rot_drill_low:3,pelvic_tilt:2,scapula_motion:1});
 assert.equal(old.cats.quality,66.7);assert.equal(old.qualityAssessments.filter(a=>a.legacy).length,6);
 assert.equal(renderQualityMarks(old.qualityAssessments,'standing','front'),'');
 const mixed=scorer.score({slide_sq:1,slide_sq_R:3,pelvic_tilt:1,pelvic_tilt_posterior:3});
 assert.equal(mixed.cats.quality,100);assert.equal(mixed.qualityAssessments.length,2);
 assert.ok(!('qualityLinks' in old));
});
test('旧APIのnote欄から全方向を復元し、旧v2も読める',()=>{
 const old=loadLegacy();const row=old.unpackQualityRecord({note:old.packQualityValues(values),cmj:30});
 for(const[k,v]of Object.entries(values))assert.equal(row[k],v);assert.equal(row.cmj,30);
 assert.equal(old.unpackQualityRecord({note:'通常のメモ'}).ssp_extension,undefined);
 assert.equal(old.unpackQualityRecord({note:JSON.stringify({schema:'needs-quality-v2',values:{pelvic_tilt:2,ssp_extension:100}})}).pelvic_tilt,2);
 assert.equal(old.unpackQualityRecord({note:JSON.stringify({schema:'needs-quality-v2',values:{ssp_extension:100}})}).ssp_extension,undefined);
});
test('全評価を同時表示し、立位3方向と全ゴルフ局面で左右・色を保つ',()=>{
 const d=scorer.score(values);
 for(const pose of ['standing','address','impact','follow']){
  const views=pose==='standing'?['front','back','side']:['front','back'];
  const svg=views.map(v=>renderQualityMarks(d.qualityAssessments,pose,v)).join('');
  for(const a of d.qualityAssessments){assert.ok(svg.includes(`data-assessment="${a.key}"`),pose+' '+a.key);}
  assert.match(svg,/data-assessment="slide_sq_R"[^>]*data-color="#F04438"/);
  assert.match(svg,/data-assessment="slide_sq_L"[^>]*data-color="#12B76A"/);
 }
 assert.match(renderSideFigure(d.qualityAssessments),/side-male.png/);
 assert.ok(!renderGolfFigure('address','front',{}, {},'x',d.qualityAssessments).includes('radialGradient'));
 assert.equal(renderQualityMarks([]),'');
 assert.equal(renderQualityMarks(scorer.score({sq_quality:3}).qualityAssessments),'');
});
