'use client';
import {useEffect,useRef,useState} from 'react';
import PhotoBoard from './photo-board';
import PhotoEditor from './photo-editor';
import {stamp} from './photo-shared';
import {photoLayout,movePhoto,removePhoto,appendPhoto} from '../../lib/photo-layout.mjs';
const EMPTY=[];
export function PhotoGallery({memberId,recordId,refresh=0,initial,preview=false,previewPhotos=EMPTY,onPreviewChange}){
 const [data,setData]=useState(initial||{photos:[],groups:[]}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState(null),[trash,setTrash]=useState(false),[loading,setLoading]=useState(!initial&&!preview);
 const generation=useRef(0),first=useRef(true),mutation=useRef(false),previewLayout=useRef(null);
 async function load(offset=0){const version=++generation.current;setLoading(true);try{
  const q=new URLSearchParams({memberId,offset:String(offset)});if(recordId)q.set('recordId',recordId);
  const response=await fetch('/api/photos?'+q,{cache:'no-store'});const body=await response.json();if(!response.ok)throw Error(body.error);
  if(version===generation.current)setData(previous=>offset?{...body,photos:[...previous.photos,...body.photos],groups:[...previous.groups,...body.groups]}:body);
 }catch(e){if(version===generation.current)setError(e.message);}finally{if(version===generation.current)setLoading(false);}}
 useEffect(()=>{if(preview){const layout=photoLayout(previewLayout.current,previewPhotos);previewLayout.current=layout;setData({photos:previewPhotos,groups:[{id:'preview',revision:0,created_at:new Date().toISOString(),layout}]});return;}
  if(first.current&&initial&&Date.now()-initial.loadedAt<30000){first.current=false;return;}
  first.current=false;load();return()=>{generation.current++;};
 },[memberId,recordId,refresh,previewPhotos]);
 async function change(photo,payload){
  if(mutation.current)throw Error('保存中です。少しお待ちください。');
  mutation.current=true;setBusy(true);setError('');
  try{
   if(preview){
    let layout=structuredClone(previewLayout.current),updates=[],photos=previewPhotos.map(p=>({...p}));
    if(payload.action==='move'){const moved=movePhoto(layout,photo.id,payload.target,crypto.randomUUID());layout=moved.layout;updates=moved.changes;}
    else if(payload.action==='delete'){removePhoto(layout,photo.id);updates=[{id:photo.id,deleted_at:new Date().toISOString()}];}
    else if(payload.action==='restore'){appendPhoto(layout,photo,{manual:true});updates=[{id:photo.id,deleted_at:null}];}
    else {if(photo.phase!==payload.phase){removePhoto(layout,photo.id);appendPhoto(layout,{...photo,phase:payload.phase},{manual:true});}updates=[{id:photo.id,phase:payload.phase,field_key:payload.fieldKey,memo:payload.memo,annotations:payload.annotations,annotation_revision:photo.annotation_revision+1}];}
    for(const update of updates)Object.assign(photos.find(p=>p.id===update.id),update);
    previewLayout.current=layout;onPreviewChange?.(photos);return {revision:photo.annotation_revision+1};
   }
   const response=await fetch('/api/photos',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId,id:photo.id,...payload})});
   const body=await response.json();if(!response.ok)throw Error(body.error);
   const refreshed=await fetch('/api/photos?'+new URLSearchParams({memberId,recordId:photo.session_id}),{cache:'no-store'});
   const updated=await refreshed.json();
   if(refreshed.ok)setData(previous=>({...previous,photos:[...previous.photos.filter(p=>p.session_id!==photo.session_id),...updated.photos],groups:previous.groups.map(g=>g.id===photo.session_id?updated.groups.find(next=>next.id===g.id)||g:g)}));
   else setError('保存済みですが一覧を更新できませんでした。再読み込みしてください。');
   return body;
  }finally{mutation.current=false;setBusy(false);}
 }
 async function move(group,id,target){const photo=data.photos.find(p=>p.id===id);if(!photo)return;try{await change(photo,{action:'move',target,boardRevision:group.revision});}catch(e){setError(e.message);}}
 async function restore(photo){try{await change(photo,{action:'restore'});}catch(e){setError(e.message);}}
 return <section className="photo-gallery" aria-busy={loading}>
  <div className="photo-gallery-controls"><button type="button" aria-pressed={!trash} onClick={()=>setTrash(false)}>写真一覧</button><button type="button" aria-pressed={trash} onClick={()=>setTrash(true)}>ごみ箱</button>{!preview&&<button type="button" disabled={loading||busy} onClick={()=>load()}>再読み込み</button>}</div>
  <p className="muted">{trash?'削除後30日間は復元できます。復元した写真は末尾に追加します。':'写真を押して編集。⠿をつかんで移動できます。写真の上で入れ替え、目印で行を追加します。'}</p>
  {error&&<p className="error" role="alert">{error}</p>}
  {trash?<div className="photo-grid">{data.photos.filter(p=>p.deleted_at).map(p=><div className="photo-card" key={p.id}><img src={p.thumbnailUrl||p.url} alt="削除した写真" loading="lazy"/><small>削除 {stamp(p.deleted_at)}</small><button type="button" disabled={busy} onClick={()=>restore(p)}>復元</button></div>)}</div>:data.groups.map(group=><section key={group.id} className="photo-session">{!recordId&&!preview&&<h3>測定回 · {stamp(group.created_at)}</h3>}<PhotoBoard group={group} photos={data.photos.filter(p=>p.session_id===group.id&&!p.deleted_at)} onOpen={setSelected} onMove={(id,target)=>move(group,id,target)} disabled={busy}/></section>)}
  {!loading&&!data.photos.some(p=>trash?!!p.deleted_at:!p.deleted_at)&&<p>{trash?'ごみ箱は空です。':'保存された写真はありません。'}</p>}
  {loading&&<p role="status">読み込み中…</p>}{data.hasMore&&<button type="button" disabled={loading||busy} onClick={()=>load(data.nextOffset)}>次の測定回を表示</button>}
  {selected&&<PhotoEditor key={selected.id} photo={selected} memberId={memberId} preview={preview} onClose={()=>setSelected(null)} onChange={change}/>}
 </section>;
}
