import {athlete} from './measurement-input.mjs';
export const PHOTO_BUCKET='athlete-photos',MAX_PHOTO_BYTES=20*1024*1024;
export const phaseLabels={before:'before',after:'after',other:'その他'};
export const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function fieldLabel(key){const d=athlete.definitions[key];return d?d.name+(key.endsWith('_R')?'・右':key.endsWith('_L')?'・左':''):'テスト未指定';}
export function photoDetailsInput(v){
 if(v.fieldKey!=null&&v.fieldKey!==''&&!athlete.fields.includes(v.fieldKey))throw Error('測定項目を確認してください。');
 const phase=v.phase==='normal'?'other':v.phase;
 if(!Object.hasOwn(phaseLabels,phase))throw Error('写真の区分を選んでください。');
 const memo=v.memo??'';
 if(typeof memo!=='string'||memo.length>500||(phase!=='other'&&memo.trim()))throw Error('その他のメモは500文字以内で入力してください。');
 return {fieldKey:v.fieldKey||null,memo:phase==='other'?memo.trim():null,phase};
}
export function photoInput(v){
 if(!uuid(v.memberId)||!uuid(v.recordId)||!uuid(v.id))throw Error('対象の測定画面を開き直してください。');
 const details=photoDetailsInput(v);
 if(!['camera','library'].includes(v.source))throw Error('写真の取得方法を確認してください。');
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[v.mime];
 if(!ext)throw Error('JPEG・PNG・WebPの写真を選んでください。HEICや動画はまだ対応していません。');
 if(!Number.isSafeInteger(v.size)||v.size<=0||v.size>MAX_PHOTO_BYTES)throw Error('写真は1枚20MB以内にしてください。');
 const time=v.capturedAt?new Date(v.capturedAt):null;
 if(time&&(!Number.isFinite(time.getTime())||time.getTime()>Date.now()+300000||time.getFullYear()<1900))throw Error('撮影日時を確認してください。');
 return {ext,capturedAt:time?time.toISOString():null,...details};
}
export function matchesImage(bytes,mime){const b=bytes;return mime==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:mime==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v):mime==='image/webp'?String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP':false;}
