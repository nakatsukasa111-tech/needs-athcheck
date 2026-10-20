'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {savePool,uploadPhoto} from '../../lib/photo-transfer.mjs';
import {fieldLabel,phaseLabels,MAX_PHOTO_BYTES} from '../../lib/photo-input.mjs';
import {athlete} from '../../lib/measurement-input.mjs';
function localTime(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
const photoFieldLabels=Object.fromEntries(athlete.fields.map(k=>[k,fieldLabel(k)]));
function TestSelect({value,onChange,all=false,disabled=false}){return <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}><option value="">{all?'すべて':'-'}</option>{Object.entries(photoFieldLabels).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select>;}
export function PhotoCapture({memberId,recordId,onClose,onSaved,preview=false}){
 const dialog=useRef(null),camera=useRef(null),library=useRef(null),busyRef=useRef(false);
 const [phase,setPhase]=useState('before'),[fieldKey,setFieldKey]=useState(''),[memo,setMemo]=useState(''),[source,setSource]=useState('camera'),[date,setDate]=useState(localTime),[files,setFiles]=useState([]),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const d=dialog.current;d?.showModal();return()=>d?.close();},[]);
 useEffect(()=>()=>{files.forEach(f=>URL.revokeObjectURL(f.url));},[files]);
 function pick(event,kind){if(busyRef.current)return;const chosen=Array.from(event.target.files||[]);event.target.value='';setError('');setStatus('');if(chosen.length>8){setError('一度に選べる写真は8枚までです。');return;}
  if(chosen.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>MAX_PHOTO_BYTES)){setError('JPEG・PNG・WebP、1枚20MB以内で選んでください。HEICや動画はまだ対応していません。');return;}
  setSource(kind);setDate(kind==='camera'?localTime():'');setFiles(chosen.map(file=>({file,id:crypto.randomUUID(),url:URL.createObjectURL(file)})));
 }
 async function save(){if(busyRef.current||!files.length)return;busyRef.current=true;setBusy(true);setError('');let done=0;const measuredStart=performance.now();try{
  const progress=files.map(()=> '待機');
  const report=(i,text)=>{progress[i]=text;setStatus(progress.map((v,n)=>(n+1)+'枚目：'+v).join(' ／ '));};
  const outcomes=await savePool(files,async(item,index)=>{if(preview){done++;return;}
   report(index,'準備中');
   const prepared=await fetch('/api/photos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,memberId,recordId,fieldKey,phase,memo:phase==='other'?memo:'',source,mime:item.file.type,size:item.file.size,capturedAt:date?new Date(date).toISOString():null})});const p=await prepared.json();if(!prepared.ok)throw Error(p.error);
   if(!p.ready){await uploadPhoto(p.url,item.file,percent=>report(index,'送信 '+percent+'%'));
    report(index,'画像を確認中');
    const finish=await fetch('/api/photos',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId,id:item.id})});const f=await finish.json();if(!finish.ok)throw Error(f.error);}
   done++;report(index,'保存済み');
  });
  const failure=outcomes.find(r=>r.status==='rejected');if(failure)throw failure.reason;
  dialog.current?.setAttribute('data-save-ms',String(Math.round(performance.now()-measuredStart)));setStatus(preview?'操作の見本です。写真は保存していません。':done+'枚を保存しました。スタッフのみ閲覧できます。');setFiles([]);onSaved?.();
 }catch(e){setError((done?done+'枚は保存済みです。':'')+(e.message||'保存できませんでした。')+' 同じ写真の再試行で重複保存はされません。');}finally{setBusy(false);busyRef.current=false;}}
 return createPortal(<dialog ref={dialog} className="photo-dialog" onCancel={e=>{e.preventDefault();if(!busyRef.current)onClose();}}>
  <div className="photo-dialog-head"><div><h2>写真を追加</h2><span className="muted">{preview?'操作の見本・サーバーには保存しません':'写真は測定数値とは別に保存されます'}</span></div><button type="button" onClick={onClose} disabled={busy} aria-label="写真を閉じる">閉じる</button></div>
  <div className="photo-phase" role="group" aria-label="写真の区分">{Object.entries(phaseLabels).map(([value,label])=><button type="button" key={value} aria-pressed={phase===value} disabled={busy} onClick={()=>setPhase(value)}>{label}</button>)}</div>
  <div className="photo-details"><label>テスト（任意）<TestSelect value={fieldKey} onChange={setFieldKey} disabled={busy}/></label>{phase==='other'&&<label>何の写真か（任意）<textarea value={memo} onChange={e=>setMemo(e.target.value)} maxLength={500} rows={2} disabled={busy} placeholder="写真についてメモを入力"/></label>}</div>
  <div className="photo-pick"><button type="button" disabled={busy} onClick={()=>camera.current.click()}>カメラで撮影</button><button type="button" disabled={busy} onClick={()=>library.current.click()}>端末から選ぶ</button><input hidden ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>pick(e,'camera')}/><input hidden ref={library} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>pick(e,'library')}/></div>
  <p className="muted">JPEG・PNG・WebP／1枚20MBまで。保存後に続けて追加できます。before と after は1枚ずつ対応付けません。</p>
  {files.length>0&&<><label htmlFor="photo-date">撮影日時（任意・選択中の写真に共通）</label><input id="photo-date" type="datetime-local" value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/><p className="muted">端末の現地時刻で入力。未入力の場合は撮影日時不明として、保存日時を表示します。</p><div className="photo-selected">{files.map(item=><figure key={item.id}><img src={item.url} alt="保存前の写真"/><figcaption>{phaseLabels[phase]}</figcaption></figure>)}</div></>}
  {error&&<p className="error" role="alert">{error}</p>}<p role="status">{status}</p><div className="photo-dialog-foot"><button type="button" disabled={busy||!files.length} onClick={save}>{busy?'保存中…':preview?'保存操作を確認':'選んだ写真を保存'}</button><span className="muted">{files.length}枚選択中</span></div>
 </dialog>,document.body);
}
const stamp=value=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
export function PhotoGallery({memberId,recordId,refresh=0,initial}){
 const [photos,setPhotos]=useState(initial?.photos||[]),[phase,setPhase]=useState(''),[key,setKey]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(!initial),[more,setMore]=useState(initial?.hasMore||false),[selected,setSelected]=useState(null),[changing,setChanging]=useState(false);
 const [editPhase,setEditPhase]=useState(''),[editKey,setEditKey]=useState(''),[editMemo,setEditMemo]=useState('');
 const generation=useRef(0),zoom=useRef(null),gallery=useRef(null),cache=useRef(new Map()),first=useRef(true);
 async function load(offset=0,version=generation.current,force=false){setBusy(true);setError('');const measuredStart=performance.now();try{
  const q=new URLSearchParams({memberId,offset:String(offset)});if(recordId)q.set('recordId',recordId);if(phase)q.set('phase',phase);if(key)q.set('fieldKey',key);
  const cacheKey=q.toString();const prior=cache.current.get(cacheKey);
  let body,kind='network';
  if(!offset&&!force&&prior&&Date.now()-prior.loadedAt<30000){body=prior;kind='memory';}
  else {const res=await fetch('/api/photos?'+q,{cache:'no-store'});body=await res.json();if(!res.ok)throw Error(body.error);}
  if(version!==generation.current)return;
  if(!offset)cache.current.set(cacheKey,body);
  setPhotos(prev=>offset?[...prev,...body.photos]:body.photos);setMore(body.hasMore);
  gallery.current?.setAttribute('data-load-ms',String(Math.round(performance.now()-measuredStart)));gallery.current?.setAttribute('data-load-kind',kind);
 }catch(e){if(version===generation.current)setError(e.message);}finally{if(version===generation.current)setBusy(false);}}
 useEffect(()=>{const v=++generation.current;
  if(first.current){first.current=false;if(initial&&Date.now()-initial.loadedAt<30000){const q=new URLSearchParams({memberId,offset:'0'});if(recordId)q.set('recordId',recordId);cache.current.set(q.toString(),initial);setBusy(false);return()=>{generation.current++;};}}
  load(0,v);return()=>{generation.current++;};},[memberId,recordId,phase,key,refresh]);
 useEffect(()=>{if(selected){setEditPhase(selected.phase);setEditKey(selected.field_key||'');setEditMemo(selected.memo||'');zoom.current?.showModal();}},[selected?.id]);
 async function change(payload){setChanging(true);setError('');try{
  const response=await fetch('/api/photos',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId,id:selected.id,...payload})});
  const result=await response.json();if(!response.ok)throw Error(result.error);
  cache.current.clear();await load(0,generation.current,true);
  if(payload.action==='edit')setSelected(previous=>({...previous,phase:payload.phase,field_key:payload.fieldKey||null,memo:payload.memo||null}));
 }catch(e){setError(e.message||'写真を変更できませんでした。');}finally{setChanging(false);}}
 const selectedIndex=selected?photos.findIndex(photo=>photo.id===selected.id):-1;
 const previous=selectedIndex>0&&photos[selectedIndex-1].session_id===selected.session_id?photos[selectedIndex-1]:null;
 const next=selectedIndex>=0&&selectedIndex<photos.length-1&&photos[selectedIndex+1].session_id===selected.session_id?photos[selectedIndex+1]:null;
 return <section ref={gallery} data-performance-version="optimized" aria-busy={busy} className="photo-gallery">
  <div className="photo-gallery-controls"><label>区分<select value={phase} onChange={e=>setPhase(e.target.value)}><option value="">すべて</option>{Object.entries(phaseLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>テスト<TestSelect value={key} onChange={setKey} all/></label><button type="button" disabled={busy} onClick={()=>{cache.current.clear();load(0,generation.current,true);}}>再読み込み</button></div>
  <p className="muted">スタッフ専用・選手には非公開。日時は日本時間です。写真を押すと拡大・変更できます。</p>{error&&<p role="alert" className="error">{error}</p>}{!photos.length&&!busy&&!error&&<p>保存された写真はありません。</p>}
  <div className="photo-grid">{photos.map(photo=><button type="button" className="photo-tile" key={photo.id} onClick={()=>setSelected(photo)}><img src={photo.thumbnailUrl||photo.url} onError={e=>{if(e.currentTarget.getAttribute('src')!==photo.url)e.currentTarget.src=photo.url;}} alt={fieldLabel(photo.field_key)+' '+phaseLabels[photo.phase]} loading="lazy"/><span className={'photo-tag '+photo.phase}>{phaseLabels[photo.phase]}</span><strong>{fieldLabel(photo.field_key)}</strong>{photo.memo&&<span className="photo-memo">{photo.memo}</span>}<small>{photo.captured_at?'撮影 '+stamp(photo.captured_at):'撮影日時不明'}<br/>保存 {stamp(photo.uploaded_at)}</small></button>)}</div>
  {busy&&<p role="status">読み込み中…</p>}{more&&<button type="button" disabled={busy} onClick={()=>load(photos.length)}>さらに表示</button>}
  {selected&&<dialog className="photo-dialog photo-zoom" ref={zoom} onCancel={()=>setSelected(null)}><div className="photo-dialog-head"><h2>{fieldLabel(selected.field_key)} · {phaseLabels[selected.phase]}</h2><button type="button" onClick={()=>setSelected(null)}>閉じる</button></div><img src={selected.url} alt={fieldLabel(selected.field_key)}/><p className="muted">{selected.captured_at?'撮影 '+stamp(selected.captured_at):'撮影日時不明'} ／ 保存 {stamp(selected.uploaded_at)}</p>
   <div className="photo-edit"><label>区分<select value={editPhase} onChange={e=>setEditPhase(e.target.value)} disabled={changing}>{Object.entries(phaseLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>テスト<TestSelect value={editKey} onChange={setEditKey} disabled={changing}/></label>{editPhase==='other'&&<label>何の写真か<textarea value={editMemo} onChange={e=>setEditMemo(e.target.value)} maxLength={500} rows={2} disabled={changing}/></label>}<button type="button" disabled={changing} onClick={()=>change({action:'edit',phase:editPhase,fieldKey:editKey,memo:editPhase==='other'?editMemo:''})}>写真の情報を保存</button></div>
   <div className="photo-order"><button type="button" disabled={!previous||changing} onClick={()=>change({action:'reorder',otherId:previous.id})}>前へ移動</button><button type="button" disabled={!next||changing} onClick={()=>change({action:'reorder',otherId:next.id})}>後へ移動</button></div><p className="muted">同じ測定記録の写真を並び替えられます。</p>
  </dialog>}
 </section>;
}

