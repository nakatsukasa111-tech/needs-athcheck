import {test} from 'node:test';
import assert from 'node:assert/strict';
import {golfLandmarks,golfColor,renderGolfOverlay} from '../src/domain/golf-overlay.mjs';
import {createBodyRenderer} from '../src/domain/bodymap.mjs';
test('全3局面で前後の左右差を保持し、未測定と0点を区別する',()=>{
 for(const pose of Object.keys(golfLandmarks)){
  assert.ok(!renderGolfOverlay(pose,{}).includes('radialGradient'));
  const svg=renderGolfOverlay(pose,{'shoulder|R':0,'shoulder|L':100});
  assert.equal((svg.match(/data-region="shoulder\|R" data-value="0" data-color="#F04438"/g)||[]).length,2);
  assert.equal((svg.match(/data-region="shoulder\|L" data-value="100" data-color="#12B76A"/g)||[]).length,2);
  assert.ok(golfLandmarks[pose].front['lower_leg|R'][0]<golfLandmarks[pose].front['lower_leg|L'][0]);
  assert.ok(golfLandmarks[pose].back['lower_leg|R'][0]>golfLandmarks[pose].back['lower_leg|L'][0]);
 }
});
test('立位とゴルフで同じ会社別境界を使用する',()=>{
 const rules={flex_green_min:80,flex_yellow_min:50};
 for(const [v,color] of [[0,'#F04438'],[49.9,'#F04438'],[50,'#F5C400'],[79.9,'#F5C400'],[80,'#12B76A'],[100,'#12B76A']]){
  assert.equal(golfColor(v,rules),color);
  assert.ok(createBodyRenderer(rules)('front','M',{'shoulder|R':v}).includes(`stop-color="${color}"`));
 }
});
test('無効値を描画せず、姿勢・インスタンスのSVG参照を分離する',()=>{
 const bad=renderGolfOverlay('address',{'hip|R':'<script>','hip|L':NaN});assert.ok(!bad.includes('radialGradient'));assert.ok(!bad.includes('<script>'));
 const a=renderGolfOverlay('address',{'hip|R':50},{},'one'),b=renderGolfOverlay('address',{'hip|R':50},{},'two');
 const ids=[...a.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);for(const [,id] of a.matchAll(/url\(#([^\)]+)\)/g)){assert.ok(ids.includes(id));assert.ok(!b.includes(`id="${id}"`));}
 assert.notEqual(a,renderGolfOverlay('follow',{'hip|R':50},{},'one'));
});
