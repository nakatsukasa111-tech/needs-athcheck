import test from 'node:test';
import assert from 'node:assert/strict';
import {photoLayout,movePhoto,removePhoto,appendPhoto} from '../lib/photo-layout.mjs';
import {annotatedThumbnail} from '../lib/photo-thumbnail.mjs';
import {validateAnnotations} from '../lib/photo-annotations.mjs';
import sharp from 'sharp';
const photo=(id,phase,day=20)=>({id,phase,status:'ready',uploaded_at:`2026-10-${day}T03:00:00.000Z`});
test('batch and alternating capture both pair by phase order, never across days',()=>{
 for(const order of [[photo('1','before'),photo('2','before'),photo('3','after'),photo('4','after')],[photo('1','before'),photo('3','after'),photo('2','before'),photo('4','after')]]){
  const layout={rows:[],other:[]};order.forEach(p=>appendPhoto(layout,p));assert.deepEqual(layout.rows.map(r=>[r.before,r.after]),[['1','3'],['2','4']]);
 }
 const mixed=photoLayout(null,[photo('1','before',19),photo('2','after',20)]);
 assert.deepEqual(mixed.rows.map(r=>[r.before,r.after]),[['1',null],[null,'2']]);
});
test('insert adds a complete row, swaps preserve ownership, manual holes stay empty',()=>{
 const photos=[photo('1','before'),photo('2','after'),photo('3','other')];
 const initial=photoLayout(null,photos);
 const inserted=movePhoto(initial,'3',{kind:'insert',side:'before',beforeRowId:initial.rows[0].id},'new');
 assert.deepEqual(inserted.layout.rows.map(r=>[r.before,r.after]),[['3',null],['1','2']]);
 const newPhoto=photo('4','after');appendPhoto(inserted.layout,newPhoto);
 assert.equal(inserted.layout.rows[0].after,null);assert.equal(inserted.layout.rows[2].after,'4');
 const swapped=movePhoto(inserted.layout,'1',{kind:'photo',id:'4'},'unused');
 assert.deepEqual(swapped.changes,[{id:'1',phase:'after'},{id:'4',phase:'before'}]);
 const moved=movePhoto(swapped.layout,'2',{kind:'other',beforeId:null},'unused');
 assert.deepEqual(moved.layout.other,['2']);assert.equal(moved.layout.rows[1].after,null);
 assert.throws(()=>movePhoto(moved.layout,'2',{kind:'slot',rowId:'missing',side:'before'},'unused'));
 removePhoto(moved.layout,'3');appendPhoto(moved.layout,photo('5','before'));
 assert.equal(moved.layout.rows[0].before,null);
});
test('restoring a deleted row origin does not duplicate row identifiers',()=>{
 const p=photo('1','before'),layout=photoLayout(null,[p]);removePhoto(layout,p.id);appendPhoto(layout,p,{manual:true});
 assert.equal(new Set(layout.rows.map(r=>r.id)).size,2);
});
test('all four widths render on a separate preview and leave original bytes intact',async()=>{
 const original=await sharp({create:{width:400,height:200,channels:3,background:'#ffffff'}}).png().toBuffer();
 const copy=Buffer.from(original);
 for(const width of [3,7,14,24]){
  const marks=validateAnnotations([{tool:'arrow',color:'#e53935',width,points:[[100,100],[900,900]]}]);
  const result=await annotatedThumbnail(original,marks);
  const meta=await sharp(result).metadata();assert.equal(meta.width,400);assert.equal(meta.height,200);
  const raw=await sharp(result).raw().toBuffer();assert.ok(raw.some(v=>v<180));
 }
 assert.deepEqual(original,copy);
 assert.throws(()=>validateAnnotations([{tool:'line',color:'#e53935',width:10000,points:[[0,0],[10,10]]}]));
});
