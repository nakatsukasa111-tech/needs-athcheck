import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {thumbnail,thumbnailPath} from '../lib/photo-thumbnail.mjs';
import {savePool} from '../lib/photo-transfer.mjs';
test('thumbnail preserves original, honors rotation and caps size',async()=>{
 const source=await sharp({create:{width:2000,height:1000,channels:3,background:'#6090cc'}}).jpeg().withMetadata({orientation:6}).toBuffer();
 const original=Buffer.from(source);const out=await thumbnail(source);const meta=await sharp(out).metadata();
 assert.equal(meta.format,'webp');assert.equal(meta.width,320);assert.equal(meta.height,640);assert.equal(meta.orientation,undefined);assert.deepEqual(source,original);assert.ok(out.length<source.length);
 assert.equal(thumbnailPath('company/member/photo.jpg'),'company/member/photo.jpg.thumb.webp');await assert.rejects(thumbnail(Buffer.from('not an image')));
});
test('bounded saves settle all active tasks after failure and retain input order',async()=>{
 let active=0,max=0,finished=0;
 const results=await savePool([0,1,2,3,4],async n=>{active++;max=Math.max(max,active);try{await new Promise(r=>setTimeout(r,n===0?20:5));if(n===1)throw Error('retry');return n;}finally{active--;finished++;}});
 assert.equal(max,2);assert.equal(active,0);assert.equal(finished,5);assert.equal(results[1].status,'rejected');assert.deepEqual(results.filter(r=>r.status==='fulfilled').map(r=>r.value),[0,2,3,4]);
});
