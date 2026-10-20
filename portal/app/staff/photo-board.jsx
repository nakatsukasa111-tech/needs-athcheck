'use client';
import {useEffect,useRef,useState} from 'react';
import {fieldLabel,phaseLabels} from '../../lib/photo-input.mjs';
import {stamp} from './photo-shared';
import {Shape} from './photo-markup';
export default function PhotoBoard({group,photos,onOpen,onMove,disabled=false,selecting=false,selectedIds=[],onSelect}){
 const [moving,setMoving]=useState(null),[hover,setHover]=useState('');
 const board=useRef(null),drag=useRef(null),suppressClick=useRef(false),latest=useRef(null);
 const byId=Object.fromEntries(photos.map(p=>[p.id,p]));
 const {rows,other}=group.layout;
 function targetAt(point){const el=document.elementFromPoint(point.clientX,point.clientY)?.closest('[data-photo-drop]');return el?.dataset.session===group.id?el:null;}
 function activate(){const d=drag.current;if(!d)return;d.active=true;suppressClick.current=true;setMoving(d.id);d.frame=requestAnimationFrame(autoScroll);}
 function autoScroll(){const d=drag.current;if(!d?.active)return;
  let scroller=board.current?.parentElement;
  while(scroller&&!(scroller.scrollHeight>scroller.clientHeight&&/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)))scroller=scroller.parentElement;
  const box=scroller?.getBoundingClientRect(),top=box?.top||0,bottom=box?.bottom||window.innerHeight;
  const delta=d.y<top+55?-12:d.y>bottom-55?12:0;
  if(delta){(scroller||window).scrollBy({top:delta});const el=targetAt({clientX:d.x,clientY:d.y});setHover(el?.dataset.photoDrop||'');}
  d.frame=requestAnimationFrame(autoScroll);
 }
 function cancel(){const d=drag.current;if(d){clearTimeout(d.timer);cancelAnimationFrame(d.frame);}drag.current=null;setMoving(null);setHover('');}
 function begin(point,id,touch){if(disabled||selecting)return;cancel();suppressClick.current=false;drag.current={id,x:point.clientX,y:point.clientY,startX:point.clientX,startY:point.clientY,touch,active:false};if(touch)drag.current.timer=setTimeout(activate,400);}
 function move(point){const d=drag.current;if(!d)return;
  d.x=point.clientX;d.y=point.clientY;
  if(!d.active&&Math.hypot(d.x-d.startX,d.y-d.startY)>8){if(d.touch){cancel();return;}activate();}
  if(d.active){const el=targetAt(point);setHover(el?.dataset.photoDrop||'');}
 }
 function finish(point){const d=drag.current;if(!d)return;const el=d.active?targetAt(point):null;cancel();if(el){const target=JSON.parse(el.dataset.photoDrop);if(target.kind!=='photo'||target.id!==d.id)onMove(d.id,target);}}
 latest.current={begin,move,finish,cancel};
 useEffect(()=>{const el=board.current;
  const start=e=>{if(e.touches.length!==1){latest.current.cancel();return;}const tile=e.target.closest('[data-drag-photo]');if(tile)latest.current.begin(e.touches[0],tile.dataset.dragPhoto,true);};
  const movement=e=>{if(e.touches.length!==1){latest.current.cancel();return;}if(drag.current?.active)e.preventDefault();latest.current.move(e.touches[0]);};
  const end=e=>{if(drag.current?.active)e.preventDefault();if(e.changedTouches[0])latest.current.finish(e.changedTouches[0]);};
  const abort=()=>latest.current.cancel();
  el.addEventListener('touchstart',start,{passive:true});el.addEventListener('touchmove',movement,{passive:false});el.addEventListener('touchend',end,{passive:false});el.addEventListener('touchcancel',abort);
  return()=>{el.removeEventListener('touchstart',start);el.removeEventListener('touchmove',movement);el.removeEventListener('touchend',end);el.removeEventListener('touchcancel',abort);const d=drag.current;if(d){clearTimeout(d.timer);cancelAnimationFrame(d.frame);}};
 },[]);
 function dropProps(target){const encoded=JSON.stringify(target);return {'data-photo-drop':encoded,'data-session':group.id,className:hover===encoded?'drop-active':'',onClick:()=>{if(moving){onMove(moving,target);cancel();}}};}
 function gap(target){const props=dropProps(target);return <button type="button" {...props} className={'photo-insert '+props.className} disabled={disabled||!moving} aria-label={target.kind==='other'?'写真の挿入位置':`${target.side==='before'?'Before':'After'}の挿入位置`}/>;}
 function tile(id){const photo=byId[id];if(!photo)return null;const props=dropProps({kind:'photo',id});
  return <div {...props} onClick={undefined} className={'photo-card '+props.className+(moving===id?' moving':'')+(selectedIds.includes(id)?' photo-selected-card':'')}>
   <button type="button" data-drag-photo={id} className="photo-card-open" disabled={disabled} aria-pressed={selecting?selectedIds.includes(id):undefined}
    onPointerDown={e=>{if(e.pointerType==='touch'||e.button!==0)return;begin(e,id,false);e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{if(e.pointerType!=='touch')move(e);}} onPointerUp={e=>{if(e.pointerType!=='touch')finish(e);}} onPointerCancel={cancel}
    onContextMenu={e=>e.preventDefault()}
    onKeyDown={e=>{if(e.key==='Escape'&&moving){e.preventDefault();e.stopPropagation();cancel();}else if(e.key===' '&&!selecting){e.preventDefault();setMoving(moving===id?null:id);}}}
    onClick={e=>{if(suppressClick.current&&e.detail!==0){suppressClick.current=false;return;}if(selecting){onSelect(id);return;}if(moving){if(moving!==id)onMove(moving,{kind:'photo',id});cancel();}else onOpen(photo);}}>
    <span className="photo-card-picture"><img src={photo.thumbnailUrl||photo.url} alt={fieldLabel(photo.field_key)+' '+phaseLabels[photo.phase]} loading="lazy" draggable={false}/>{photo.annotations?.length>0&&<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">{photo.annotations.map((mark,index)=><Shape key={index} mark={mark}/>)}</svg>}</span>
    <span className="photo-card-meta"><span className={'photo-tag '+photo.phase}>{phaseLabels[photo.phase]}</span><small>{stamp(photo.captured_at||photo.uploaded_at)}</small></span>{selecting&&<span className="photo-selection-mark" aria-hidden="true">{selectedIds.includes(id)?'✓':'○'}</span>}{photo.field_key&&<strong>{fieldLabel(photo.field_key)}</strong>}{photo.memo&&<span className="photo-memo">{photo.memo}</span>}
   </button>
  </div>;
 }
 return <div ref={board} className={'photo-board'+(moving?' is-moving':'')} aria-label="写真の配置">
  <div className="photo-pair-head"><strong>Before</strong><strong>After</strong></div>
  {rows.filter(row=>row.before||row.after).map(row=><div key={row.id}><div className="photo-pair">{['before','after'].map(side=><div key={side}>{gap({kind:'insert',side,beforeRowId:row.id})}</div>)}</div><div className="photo-pair">{['before','after'].map(side=><div key={side}>{row[side]?tile(row[side]):<button type="button" {...dropProps({kind:'slot',rowId:row.id,side})} className={'photo-empty '+(hover===JSON.stringify({kind:'slot',rowId:row.id,side})?'drop-active':'')} disabled={disabled||!moving} aria-label={`${side==='before'?'Before':'After'}の空欄`}>空欄</button>}</div>)}</div></div>)}
  <div className="photo-pair">{['before','after'].map(side=><div key={side}>{gap({kind:'insert',side,beforeRowId:null})}</div>)}</div>
  <h3>その他</h3><div className="photo-others">{other.map(id=><div key={id}>{gap({kind:'other',beforeId:id})}{tile(id)}</div>)}{gap({kind:'other',beforeId:null})}</div>
 </div>;
}
