import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBodyRenderer} from '../src/domain/bodymap.mjs';
test('人体図は男女・前後を保持し、未測定と0点を区別する',()=>{
 const draw=createBodyRenderer({},'first');
 const empty=draw('front','M',{}),zero=draw('front','M',{'hip|R':0});
 assert.ok(!empty.includes('radialGradient'));assert.ok(zero.includes('radialGradient'));
 assert.notEqual(createBodyRenderer()('front','M',{}),createBodyRenderer()('front','F',{}));
 assert.notEqual(createBodyRenderer()('front','M',{}),createBodyRenderer()('back','M',{}));
 assert.ok(empty.includes('data:image/png;base64,'));
 const ids=[...zero.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
 for(const [,ref] of zero.matchAll(/url\(#([^\)]+)\)/g))assert.ok(ids.includes(ref));
});
test('HTMLや無効値を人体図へ挿入せず、描画IDはコンポーネント間で分離する',()=>{
 const a=createBodyRenderer({},'one')('front','M',{'hip|R':'<script>bad</script>'});
 const b=createBodyRenderer({},'two')('front','M',{});
 assert.ok(!a.includes('<script>'));assert.ok(a.includes('one-clipbm1'));assert.ok(b.includes('two-clipbm1'));
});
