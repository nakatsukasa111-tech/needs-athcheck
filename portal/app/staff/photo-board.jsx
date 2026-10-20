'use client';
import {useRef,useState} from 'react';
import {fieldLabel,phaseLabels} from '../../lib/photo-input.mjs';
import {stamp} from './photo-shared';
import {Shape} from './photo-markup';
export default function PhotoBoard({group,photos,onOpen,onMove,disabled=false}){
 const [moving,setMoving]=useState(null),[hover,setHover]=useState(''),drag=useRef(null);
 const byId=Object.fromEntries(photos.map(p=>[p.id,p]));
 const {rows,other}=group.layout;
 function targetAt(event){const el=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-photo-drop]');return el?.dataset.session===group.id?el:null;}
 function down(event,id){if(disabled)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drag.current={id,x:event.clientX,y:event.clientY};setMoving(id);}
 function move(event){if(!drag.current)return;const el=targetAt(event);setHover(el?.dataset.photoDrop||'');
  let scroller=event.currentTarget.parentElement;
  while(scroller&&!(scroller.scrollHeight>scroller.clientHeight&&/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)))scroller=scroller.parentElement;
  const box=scroller?.getBoundingClientRect(),top=box?.top||0,bottom=box?.bottom||window.innerHeight;
  const delta=event.clientY<top+65?-24:event.clientY>bottom-65?24:0;
  if(delta)(scroller||window).scrollBy({top:delta});
 }
 function finish(event){if(!drag.current)return;const id=drag.current.id,el=targetAt(event);drag.current=null;setMoving(null);setHover('');if(el){const target=JSON.parse(el.dataset.photoDrop);if(target.kind!=='photo'||target.id!==id)onMove(id,target);}}
 function dropProps(target){const encoded=JSON.stringify(target);return {'data-photo-drop':encoded,'data-session':group.id,className:hover===encoded?'drop-active':'',onClick:()=>{if(moving){onMove(moving,target);setMoving(null);}}};}
 function gap(target){const props=dropProps(target);return <button type="button" {...props} className={'photo-insert '+props.className} disabled={disabled||!moving} aria-label={target.kind==='other'?'ここに写真を差し込む':`${target.side==='before'?'Before':'After'}側に行を追加`}><span>{target.kind==='other'?'ここに差し込む':'ここに行を追加'}</span></button>;}
 function tile(id){const photo=byId[id];if(!photo)return null;const props=dropProps({kind:'photo',id});
  return <div {...props} onClick={undefined} className={'photo-card '+props.className+(moving===id?' moving':'')}>
   <button type="button" className="photo-card-open" disabled={disabled} onClick={()=>moving?(onMove(moving,{kind:'photo',id}),setMoving(null)):onOpen(photo)}><span className="photo-card-picture"><img src={photo.thumbnailUrl||photo.url} alt={fieldLabel(photo.field_key)+' '+phaseLabels[photo.phase]} loading="lazy" draggable={false}/>{photo.annotations?.length>0&&<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">{photo.annotations.map((mark,index)=><Shape key={index} mark={mark}/>)}</svg>}</span><span className={'photo-tag '+photo.phase}>{phaseLabels[photo.phase]}</span><small>{stamp(photo.captured_at||photo.uploaded_at)}</small>{photo.field_key&&<strong>{fieldLabel(photo.field_key)}</strong>}{photo.memo&&<span className="photo-memo">{photo.memo}</span>}</button>
   <button type="button" className="photo-drag" aria-label="写真を移動" disabled={disabled} onPointerDown={e=>down(e,id)} onPointerMove={move} onPointerUp={finish} onPointerCancel={()=>{drag.current=null;setMoving(null);setHover('');}} onClick={e=>{if(e.detail===0)setMoving(moving===id?null:id);}}>⠿</button>
  </div>;
 }
 return <div className={'photo-board'+(moving?' is-moving':'')} aria-label="写真の配置">
  <div className="photo-pair-head"><strong>Before</strong><strong>After</strong></div>
  {rows.map(row=><div key={row.id}><div className="photo-pair">{['before','after'].map(side=><div key={side}>{gap({kind:'insert',side,beforeRowId:row.id})}</div>)}</div><div className="photo-pair">{['before','after'].map(side=><div key={side}>{row[side]?tile(row[side]):<button type="button" {...dropProps({kind:'slot',rowId:row.id,side})} className={'photo-empty '+(hover===JSON.stringify({kind:'slot',rowId:row.id,side})?'drop-active':'')} disabled={disabled||!moving} aria-label={`${side==='before'?'Before':'After'}の空欄`}>空欄</button>}</div>)}</div></div>)}
  <div className="photo-pair">{['before','after'].map(side=><div key={side}>{gap({kind:'insert',side,beforeRowId:null})}</div>)}</div>
  <h3>その他</h3><div className="photo-others">{other.map(id=><div key={id}>{gap({kind:'other',beforeId:id})}{tile(id)}</div>)}{gap({kind:'other',beforeId:null})}</div>
  {moving&&<button type="button" onClick={()=>{setMoving(null);setHover('');}}>移動をキャンセル</button>}
 </div>;
}
