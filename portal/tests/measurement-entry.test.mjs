import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allFields,getMode,definitions} from '../lib/measurement-modes.mjs';
import {measurementGroups,fieldDirection,keypadValue,completedNumber} from '../lib/measurement-entry.mjs';

test('grouping keeps every course field exactly once and pairs each direction',()=>{
 const groups=measurementGroups(),fields=groups.flatMap(g=>g.fields);
 assert.equal(new Set(fields).size,allFields.length);
 assert.deepEqual([...fields].sort(),[...allFields].sort());
 for(const mode of ['athlete','basic','active']){
  const enabled=getMode(mode).fields;
  assert.equal(groups.flatMap(g=>g.fields.filter(k=>enabled.includes(k))).length,enabled.length);
 }
 for(const g of groups){
  assert.ok(g.fields.every(k=>definitions[k].cat===g.cat));
  for(const key of g.fields.filter(k=>k.endsWith('_R')))assert.ok(g.fields.includes(key.replace(/_R$/,'_L')));
 }
 assert.deepEqual(groups.find(g=>g.key==='ssp').fields.map(fieldDirection),['伸展','屈曲']);
 assert.deepEqual(groups.find(g=>g.key==='pelvic_tilt').fields.map(fieldDirection),['前傾','後傾']);
});

test('numeric entry preserves measured zero and clears to unmeasured',()=>{
 const value=keypadValue('','0');
 assert.equal(completedNumber(value),'0');
 assert.equal(keypadValue(value,'clear'),'');
 assert.equal(keypadValue(value,'backspace'),'');
 assert.equal(keypadValue('12.5','3',{replace:true}),'3');
 assert.equal(keypadValue('12.5','backspace'),'12.');
 assert.equal(completedNumber('12.'),'12');
});

test('decimal values support seconds and kilograms; repetition entry stays integer',()=>{
 let value='';for(const k of ['1','2','.','5','.'])value=keypadValue(value,k);
 assert.equal(value,'12.5');
 assert.equal(keypadValue('','.'),'0.');
 assert.equal(keypadValue('12','.',{integer:true}),'12');
 assert.equal(keypadValue('12','-'),'12');
 assert.equal(keypadValue('123456789012','3'),'123456789012');
});
