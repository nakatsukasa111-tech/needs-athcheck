import test from 'node:test';
import assert from 'node:assert/strict';
import {sportCrop} from '../src/domain/pose-crops.mjs';
import {renderGolfFigure} from '../src/domain/quality-overlay.mjs';
const contains=(polygon,x,y)=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
 const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
 if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
}return inside;};
test('pitcher release retains ball beyond cell and excludes adjacent glove/foot',()=>{
 for(const sex of ['M','F']){const p=sportCrop('baseball-pitcher',1,'front',sex);
 assert.equal(contains(p,1089,116),true);assert.equal(contains(p,515,200),false);
 assert.equal(contains(p,1070,245),false);assert.equal(contains(p,700,530),false);}
});
test('batter top excludes rear bat while rear retains it; lacrosse retains outstretched foot',()=>{
 assert.equal(contains(sportCrop('baseball-batter',0,'front'),310,478),false);
 assert.equal(contains(sportCrop('baseball-batter',0,'back'),310,478),true);
 assert.equal(contains(sportCrop('lacrosse',2,'front'),1015,440),true);
 assert.equal(contains(sportCrop('lacrosse',2,'front'),1440,490),false);
});
test('golf image is clipped inside the mirrored group, independently of score marks',()=>{
 for(const mirror of [false,true])for(const view of ['front','back']){
 const html=renderGolfFigure('follow',view,{}, {},'audit',undefined,'/golf/male/',mirror);
 assert.match(html,new RegExp('<rect x="'+(view==='front'?0:768)+'" y="0" width="768" height="1024"'));
 assert.ok(html.includes('<g clip-path="url(#golf-crop-audit-'+view+')"><image'));
 }
});
