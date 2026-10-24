import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getMode,definitions,modeCategories,scoreMode} from '../lib/measurement-modes.mjs';
import {measurementInput} from '../lib/measurement-input.mjs';
import {scoreRecord,historyView} from '../lib/result-view.mjs';
import {candidatePoints,exerciseProposals} from '../lib/exercise-view.mjs';
import {photoDetailsInput,fieldLabel} from '../lib/photo-input.mjs';
import {createAthleteScorer} from '../../src/domain/athlete-scoring.mjs';
import {createDemoMeasurement} from '../lib/demo-measurement.mjs';
import {masters,plain} from '../../tests/helpers.mjs';
const settings=masters(),member={birth_date:'1990-01-01',threshold_sex:'M'};
function form(mode,values){const f=new FormData();f.set('measurement_mode',mode);f.set('measured_on','2026-10-24');f.set('weight','65');for(const [k,v]of Object.entries(values))f.set('value:'+k,String(v));return f;}
test('approved course batteries retain all directions and exact field counts',()=>{
 for(const [id,expected]of Object.entries({athlete:[15,4,9,7,15],basic:[12,4,3,0,11],active:[15,4,6,4,15]}))assert.deepEqual(['flex','balance','strength','jump','quality'].map(c=>getMode(id).fields.filter(k=>definitions[k].cat===c).length),expected);
 assert.equal(getMode('basic').sports,false);assert.equal(getMode('active').sports,true);
 assert.equal(modeCategories('basic').jump,undefined);assert.throws(()=>getMode('__proto__'));
});
test('posted inactive values and estimates cannot enter a basic measurement or its analysis',()=>{
 const f=form('basic',{banzai_R:0,cmj:45,bridge:3,ssp_extension:3,bp_1rm:120});f.set('estimated:bp_1rm','on');
 const row=measurementInput(f,member,settings);
 assert.deepEqual(row.values,{banzai_R:0});assert.deepEqual(row.estimated_items,[]);
 assert.equal(row.definition_version,'general-basic-v1');assert.equal(row.saved_score.cats.flex,0);
 assert.equal(row.saved_score.cats.jump,undefined);assert.deepEqual(row.saved_score.jump,{});
 assert.throws(()=>measurementInput(form('basic',{cmj:45}),member,settings),/1項目/);
 assert.throws(()=>measurementInput(form('unknown',{split:2}),member,settings),/モード/);
});
test('active jumps use CMJ/SLCMJ/hop only, never fabricate SQJ or ABJ comparisons',()=>{
 const row=measurementInput(form('active',{cmj:30,sl_cmj_R:12,sl_cmj_L:15,hop_rsi:2,sqj:20,abj:40,drop_rsi:3}),member,settings);
 const s=row.saved_score;
 assert.deepEqual(Object.keys(row.values).sort(),['cmj','hop_rsi','sl_cmj_L','sl_cmj_R']);
 assert.equal(s.jump.ssc,undefined);assert.equal(s.jump.arm,undefined);assert.equal(s.jump.rsiDiff,undefined);assert.equal(s.jump.sl.sides.length,2);assert.equal(s.radars.jump.length,3);
});
test('chair stand is stored including zero but never borrows a different test threshold',()=>{
 const zero=measurementInput(form('basic',{chair_stand_30:0}),member,settings);
 assert.equal(zero.values.chair_stand_30,0);assert.equal(zero.saved_score.measured,0);
 assert.equal(zero.saved_score.cats.strength,undefined);assert.equal(zero.saved_score.items[0].color,'gray');
 const mixed=measurementInput(form('basic',{chair_stand_30:20,ab30s:18}),member,settings);
 assert.equal(mixed.saved_score.cats.strength,createAthleteScorer(settings).score({ab30s:18},{sex:'M',band:'adult'}).cats.strength);
 assert.throws(()=>measurementInput(form('basic',{chair_stand_30:1.5}),member,settings),/整数/);
 assert.equal(photoDetailsInput({fieldKey:'chair_stand_30',phase:'before'}).fieldKey,'chair_stand_30');assert.equal(fieldLabel('chair_stand_30'),'30秒椅子立ち上がり');
});
test('general snapshots survive changed company thresholds and mode-specific settings stay isolated',()=>{
 const row=measurementInput(form('active',{cmj:30}),member,settings);
 const changed=structuredClone(settings);changed.thresholds['cmj|M|adult']={red:0,green:1,direction:'high'};
 assert.deepEqual(plain(scoreRecord(row,changed)),plain(scoreMode(row.values,{sex:'M',band:'adult',weight:65,est:{}},settings,'active')));
 const isolated={...settings,modes:{active:changed}};
 assert.equal(measurementInput(form('active',{cmj:30}),member,isolated).saved_score.pts.cmj,3);
 assert.equal(measurementInput(form('athlete',{cmj:30}),member,isolated).saved_score.pts.cmj,createAthleteScorer(settings).score({cmj:30},{sex:'M',band:'adult'}).pts.cmj);
});
test('history does not connect totals across different mode definitions',()=>{
 const rows=['basic','active','athlete'].map((m,i)=>({...measurementInput(form(m,{split:2}),member,settings),id:String(i)}));
 assert.equal(historyView(rows,settings,'general-basic-v1').length,1);
 assert.equal(historyView(rows,settings,'general-active-v1')[0].id,'1');
});
test('recommendations use only the general course measurements with existing approval controls',()=>{
 const row=measurementInput(form('active',{cmj:20}),member,settings),score=scoreRecord(row,settings);
 row.values.sqj=1;
 assert.equal(candidatePoints(row,score).sqj,undefined);
 const lessons=[{company_id:'A',id:'x',title:'架空教材',tags:[],source_approved:true,member_enabled:true,member_url:'https://example.test'}];
 const rules=[{company_id:'A',id:'r',field:'cmj',max_point:3,tags:[],lesson_ids:['x'],reason:'測定結果の確認',approved:false}];
 assert.equal(exerciseProposals('A',row,score,lessons,rules)[0].ruleApproved,false);
});
test('athlete scoring stays byte-equivalent across sex, partial data and legacy quality inputs',()=>{
 for(const sex of ['M','F'])for(let i=0;i<12;i++){
  const demo=createDemoMeasurement(),values=Object.fromEntries(Object.entries(demo.values).filter((_,n)=>n%(i+2)!==0));
  values.slide_sq=2;
  const ctx={sex,band:'adult',weight:demo.weight};
  assert.deepEqual(scoreMode(values,ctx,settings,'athlete'),createAthleteScorer(settings).score(values,ctx));
 }
});
