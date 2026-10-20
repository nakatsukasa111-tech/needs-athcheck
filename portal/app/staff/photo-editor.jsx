'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import PhotoMarkup from './photo-markup';
import {TestSelect,stamp} from './photo-shared';
import {phaseLabels,fieldLabel} from '../../lib/photo-input.mjs';
export default function PhotoEditor({photo,memberId,onClose,onChange,preview=false}){
 const dialog=useRef(null);
 const [confirmation,setConfirmation]=useState(null);
 const [marks,setMarks]=useState([]),[phase,setPhase]=useState(photo.phase),[key,setKey]=useState(photo.field_key||''),[memo,setMemo]=useState(photo.memo||''),[revision,setRevision]=useState(photo.annotation_revision||0),[baseline,setBaseline]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
 const value={annotations:marks,phase,fieldKey:key,memo},dirty=baseline!==null&&JSON.stringify(value)!==baseline;
 useEffect(()=>{dialog.current?.showModal();let active=true;
  const apply=body=>{if(!active)return;setMarks(body.annotations);setRevision(body.annotation_revision);setPhase(body.phase);setKey(body.field_key||'');setMemo(body.memo||'');setBaseline(JSON.stringify({annotations:body.annotations,phase:body.phase,fieldKey:body.field_key||'',memo:body.memo||''}));};
  if(preview)apply(photo);
  else fetch('/api/photos?'+new URLSearchParams({memberId,photoId:photo.id}),{cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error);return b;}).then(apply).catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;};
 },[photo.id]);
 function close(){if(busy)return;if(dirty){setConfirmation('discard');return;}onClose();}
 async function save(){setBusy(true);setError('');setStatus('');try{
  const result=await onChange(photo,{action:'edit',...value,revision});
  setRevision(result.revision);setBaseline(JSON.stringify(value));setStatus('写真を保存済み');
 }catch(e){setError('写真が保存されませんでした。'+e.message);}finally{setBusy(false);}}
 async function remove(){setConfirmation(null);setBusy(true);try{await onChange(photo,{action:'delete'});onClose();}catch(e){setError(e.message);setBusy(false);}}
 return createPortal(<dialog ref={dialog} className="photo-dialog photo-zoom" onCancel={e=>{e.preventDefault();close();}}>
  <div className="photo-dialog-head"><h2>写真を編集</h2><button type="button" disabled={busy} onClick={close}>閉じる</button></div>
  {baseline!==null?<PhotoMarkup photo={photo} marks={marks} setMarks={setMarks} busy={busy}/>:<p>読み込み中…</p>}
  <p className="muted">{photo.captured_at?'撮影 '+stamp(photo.captured_at):'撮影日時不明'} ／ 保存 {stamp(photo.uploaded_at)}</p>
  <div className="photo-edit"><label>区分<select value={phase} disabled={busy||baseline===null} onChange={e=>setPhase(e.target.value)}>{Object.entries(phaseLabels).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label><label>テスト（任意）<TestSelect value={key} disabled={busy||baseline===null} onChange={setKey}/></label><label>メモ（任意）<textarea value={memo} disabled={busy||baseline===null} onChange={e=>setMemo(e.target.value)} rows={2} maxLength={500}/></label></div>
  {error&&<p className="error" role="alert">{error}</p>}<p role="status">{status}</p>
  <div className="photo-editor-footer">{confirmation?<div role="alertdialog" aria-label={confirmation==='delete'?'写真の削除確認':'未保存の変更'} className="photo-confirm"><p>{confirmation==='delete'?'削除して良いですか？':'未保存の変更があります。保存せずに閉じますか？'}</p><button type="button" onClick={()=>setConfirmation(null)}>キャンセル</button><button type="button" className="photo-delete" onClick={confirmation==='delete'?remove:onClose}>{confirmation==='delete'?'削除する':'保存せず閉じる'}</button></div>:<><button type="button" className="photo-delete" disabled={busy} onClick={()=>setConfirmation('delete')}>削除</button><button type="button" disabled={busy||baseline===null||!dirty} onClick={save}>{busy?'保存中…':'保存'}</button><button type="button" disabled={busy} onClick={close}>閉じる</button></>}</div>
 </dialog>,document.body);
}
