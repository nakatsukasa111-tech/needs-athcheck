import { readFileSync, writeFileSync } from 'node:fs';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8').replace(/\r\n/g,'\n');
function block(a,b){const start=html.indexOf(a),end=html.indexOf(b,start);if(start<0||end<0)throw Error('抽出位置が不明');return html.slice(start,end).trim();}
const regions=block('var BODY_REGIONS =','var BODY_MAP =');
const colors=block('var COLOR =','// 1〜3点 → 色');
const art=block('var FIGS =','</script>');
const source=`// tools/extract-bodymap.mjs で生成。既存の6枚の人体図と描画を保持する。直接編集しない。
${regions}
export const bodyRegions=BODY_REGIONS;
export const bodyThemes=BODY_THEMES;
export function createBodyRenderer(rules={},prefix='body'){
 const rule=(key,fallback)=>Number.isFinite(Number(rules[key]))&&rules[key]!==''?Number(rules[key]):fallback;
 ${colors}
 ${art}
 return (view,sex,scores)=>{
   const safe=Object.fromEntries(Object.entries(scores??{}).filter(([,v])=>typeof v==='number'&&Number.isFinite(v)));
   return buildBodyFigure(view==='back'?'back':'front',sex==='M'?'male':sex==='F'?'female':'neutral',safe).replace(/(id="|url\\(#)([^"\)]+)/g,(_,a,b)=>a+prefix.replace(/[^a-zA-Z0-9_-]/g,'')+'-'+b);
 };
}
`;
const path=new URL('src/domain/bodymap.mjs',root);
if(process.argv.includes('--check')){if(readFileSync(path,'utf8').replace(/\r\n/g,'\n')!==source)throw Error('人体図の生成差分があります');console.log('人体図の同期: OK');}else writeFileSync(path,source);
