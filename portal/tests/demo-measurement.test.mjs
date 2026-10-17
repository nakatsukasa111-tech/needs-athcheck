import test from 'node:test';
import assert from 'node:assert/strict';
import {canFillDemo,createDemoMeasurement} from '../lib/demo-measurement.mjs';
import {athlete,measurementInput} from '../lib/measurement-input.mjs';
import {masters} from '../../tests/helpers.mjs';
test('デモ機能は指定の3会員だけ。名前一致や別会社では有効にしない',()=>{
 const member={id:'3b3b9a22-b335-4cda-8c4c-f14901036abd',company_id:'78318e46-276c-48a2-b6d4-b0fa279671fe'};
 for(const id of ['d97c5190-57e9-50f7-af7c-64eedeb66b08','64992d17-7f10-5a69-aba4-883c40b0d219']){assert.equal(canFillDemo({...member,id}),true);assert.equal(canFillDemo({...member,id,company_id:'other'}),false);}
 assert.equal(canFillDemo(member),true);assert.equal(canFillDemo({...member,id:'real',display_name:'デモ会員（架空）'}),false);assert.equal(canFillDemo({...member,company_id:'other'}),false);assert.equal(canFillDemo(null),false);
});
test('全50項目が保存可能で、方向別評価も毎回生成する',()=>{
 let previous;let seed=37;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let i=0;i<30;i++){
  const d=createDemoMeasurement(previous,random);assert.deepEqual(Object.keys(d.values).sort(),[...athlete.fields].sort());assert.notDeepEqual(d,previous);
  const f=new FormData();f.set('measured_on','2026-10-17');f.set('weight',d.weight);for(const[k,v]of Object.entries(d.values))f.set('value:'+k,v);
  const row=measurementInput(f,{birth_date:'1990-01-01',threshold_sex:'M'},masters());assert.deepEqual(row.values,d.values);assert.equal(row.published,false);previous=d;
 }
 const a=createDemoMeasurement(null,()=>0);const b=createDemoMeasurement(a,()=>0);assert.notDeepEqual(a,b);
});
