'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {uploadPhoto} from '../../lib/photo-transfer.mjs';
import {phaseLabels,MAX_PHOTO_BYTES} from '../../lib/photo-input.mjs';
import {TestSelect} from './photo-shared';
import {PhotoGallery} from './photo-gallery';
export function PhotoCapture({memberId,recordId,onClose,onSaved,preview=false}){
 const dialog=useRef(null),camera=useRef(null),library=useRef(null),jobsRef=useRef([]),worker=useRef(false),urls=useRef([]),acceptedClock=useRef(0);
 const [phase,setPhase]=useState('before'),[fieldKey,setFieldKey]=useState(''),[memo,setMemo]=useState(''),[jobs,setJobs]=useState([]),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[previewPhotos,setPreviewPhotos]=useState([]);
 const pending=jobs.some(j=>j.status==='queued'||j.status==='saving'),failed=jobs.filter(j=>j.status==='error');
 useEffect(()=>{dialog.current?.showModal();return()=>{urls.current.forEach(url=>URL.revokeObjectURL(url));};},[]);
 useEffect(()=>{if(!pending)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[pending]);
 function update(job,patch){Object.assign(job,patch);setJobs([...jobsRef.current]);}
 function close(){if(pending)return;if(failed.length&&!confirm('保存されていない写真があります。閉じますか？'))return;onClose();}
 async function processQueue(){if(worker.current)return;worker.current=true;
  try{let item;while((item=jobsRef.current.find(j=>j.status==='queued'))){
   update(item,{status:'saving',text:'写真を保存中…'});
   try{
    if(preview){
     const saved={id:item.id,session_id:'preview',phase:item.phase,field_key:item.fieldKey,memo:item.memo,captured_at:item.capturedAt,uploaded_at:item.acceptedAt,status:'ready',url:item.url,thumbnailUrl:item.url,annotations:[],annotation_revision:0};
     setPreviewPhotos(previous=>[...previous,saved]);
    }else{
     const response=await fetch('/api/photos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,memberId,recordId,fieldKey:item.fieldKey,phase:item.phase,memo:item.memo,source:item.source,mime:item.file.type,size:item.file.size,capturedAt:item.capturedAt})});
     const prepared=await response.json();if(!response.ok)throw Error(prepared.error);
     if(!prepared.ready){
      await uploadPhoto(prepared.url,item.file,percent=>update(item,{text:`写真を保存中… ${percent}%`}));
      update(item,{text:'写真を保存中…'});
      const finish=await fetch('/api/photos',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId,id:item.id})});const body=await finish.json();if(!finish.ok)throw Error(body.error);
     }
    }
    update(item,{status:'saved',text:preview?'見本に追加しました（サーバー保存なし）':'写真を保存済み'});setRefresh(v=>v+1);onSaved?.();
   }catch(e){update(item,{status:'error',text:'写真が保存されませんでした',error:e.message});}
  }}finally{worker.current=false;}
 }
 function pick(event,source){
  const chosen=Array.from(event.target.files||[]);event.target.value='';setError('');if(!chosen.length)return;
  if(chosen.length>8){setError('一度に選べる写真は8枚までです。');return;}
  if(chosen.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>MAX_PHOTO_BYTES)){setError('JPEG・PNG・WebP、1枚20MB以内で選んでください。HEICや動画はまだ対応していません。');return;}
  const added=chosen.map(file=>{const url=URL.createObjectURL(file);urls.current.push(url);acceptedClock.current=Math.max(Date.now(),acceptedClock.current+1);const acceptedAt=new Date(acceptedClock.current).toISOString();return {id:crypto.randomUUID(),file,url,phase,fieldKey,memo,source,capturedAt:source==='camera'?acceptedAt:null,acceptedAt,status:'queued',text:'写真を保存中…'};});
  jobsRef.current.push(...added);setJobs([...jobsRef.current]);processQueue();
 }
 function retry(job){update(job,{status:'queued',error:null,text:'写真を保存中…'});processQueue();}
 return createPortal(<dialog ref={dialog} className="photo-dialog photo-capture" onCancel={e=>{e.preventDefault();close();}}>
  <div className="photo-dialog-head"><div><h2>写真を追加</h2><span className="muted">{preview?'操作の見本・サーバーには保存しません':'撮影・選択後に自動保存します'}</span></div><button type="button" disabled={pending} onClick={close}>閉じる</button></div>
  <div className="photo-phase" role="group" aria-label="写真の区分">{Object.entries(phaseLabels).map(([value,label])=><button type="button" key={value} aria-pressed={phase===value} onClick={()=>setPhase(value)}>{label}</button>)}</div>
  <div className="photo-details"><label>テスト（任意）<TestSelect value={fieldKey} onChange={setFieldKey}/></label><label>メモ（任意）<textarea value={memo} onChange={e=>setMemo(e.target.value)} maxLength={500} rows={2}/></label></div>
  <div className="photo-pick"><button type="button" onClick={()=>camera.current.click()}>カメラで撮影</button><button type="button" onClick={()=>library.current.click()}>端末から選ぶ</button><input hidden ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>pick(e,'camera')}/><input hidden ref={library} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>pick(e,'library')}/></div>
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="photo-save-queue" aria-live="polite">{jobs.filter(j=>j.status!=='saved').map(job=><div key={job.id}><img src={job.url} alt="追加した写真"/><span>{phaseLabels[job.phase]} · {job.text}{job.error&&<small>{job.error}</small>}</span>{job.status==='error'&&<button type="button" onClick={()=>retry(job)}>再試行</button>}</div>)}</div>
  {jobs.some(j=>j.status==='saved')&&<p role="status">{preview?'見本に追加しました（サーバー保存なし）':'写真を保存済み'}。続けて撮影できます。</p>}
  <h3>今回の測定の写真</h3><PhotoGallery memberId={memberId} recordId={recordId} refresh={refresh} preview={preview} previewPhotos={previewPhotos} onPreviewChange={setPreviewPhotos}/>
 </dialog>,document.body);
}
