'use client';
import {useRef,useState} from 'react';
import {annotationColors,annotationTools,annotationWidths} from '../../lib/photo-annotations.mjs';

const clamp=value=>Math.max(0,Math.min(1000,Math.round(value)));
function point(event){const box=event.currentTarget.getBoundingClientRect();return [clamp((event.clientX-box.left)/box.width*1000),clamp((event.clientY-box.top)/box.height*1000)];}
export function Shape({mark}){
 const {tool,color,points}=mark,first=points[0],last=points.at(-1),w=mark.width||6,common={fill:'none',stroke:color,strokeWidth:w,strokeLinecap:'round',strokeLinejoin:'round'};
 if(tool==='pen')return <polyline points={points.map(p=>p.join(',')).join(' ')} {...common}/>;
 if(tool==='circle')return <ellipse cx={(first[0]+last[0])/2} cy={(first[1]+last[1])/2} rx={Math.max(8,Math.abs(last[0]-first[0])/2)} ry={Math.max(8,Math.abs(last[1]-first[1])/2)} {...common}/>;
 const angle=Math.atan2(last[1]-first[1],last[0]-first[0]),length=w*3+12;
 return <><line x1={first[0]} y1={first[1]} x2={last[0]} y2={last[1]} {...common}/>{tool==='arrow'&&<polyline points={`${last[0]-length*Math.cos(angle-.55)},${last[1]-length*Math.sin(angle-.55)} ${last.join(',')} ${last[0]-length*Math.cos(angle+.55)},${last[1]-length*Math.sin(angle+.55)}`} {...common}/>}</>;
}

export default function PhotoMarkup({photo,marks,setMarks,busy}){
 const [tool,setTool]=useState('pen'),[color,setColor]=useState('#e53935'),[width,setWidth]=useState(7),[original,setOriginal]=useState(false),[draft,setDraft]=useState(null);
 const drawing=useRef(null);
 function start(event){if(original||busy||drawing.current)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);const p=point(event);drawing.current={tool,color,width,points:[p,p]};setDraft(drawing.current);}
 function move(event){if(!drawing.current)return;event.preventDefault();const p=point(event),current=drawing.current;
  let points;
  if(current.tool==='pen'){
   const last=current.points.at(-1);if(Math.hypot(p[0]-last[0],p[1]-last[1])<3)return;
   points=current.points.length<200?[...current.points,p]:[...current.points.slice(0,-1),p];
  }else points=[current.points[0],p];
  drawing.current={...current,points};setDraft(drawing.current);
 }
 function finish(event){if(!drawing.current)return;move(event);const mark=drawing.current;drawing.current=null;setDraft(null);setMarks(previous=>{const remaining=4000-previous.reduce((count,item)=>count+item.points.length,0);return previous.length<80&&remaining>=2?[...previous,{...mark,points:mark.points.slice(0,remaining)}]:previous;});}
 function cancel(){drawing.current=null;setDraft(null);}
 return <section className="photo-markup">
  <div className="photo-markup-toolbar"><div role="group" aria-label="線と印の種類">{Object.entries(annotationTools).map(([value,label])=><button type="button" key={value} aria-pressed={tool===value} onClick={()=>{setTool(value);setOriginal(false);}} disabled={busy}>{label}</button>)}</div><div role="group" aria-label="線と印の色">{Object.entries(annotationColors).map(([value,label])=><button type="button" key={value} className="photo-ink" aria-label={label} aria-pressed={color===value} title={label} style={{'--ink-color':value}} onClick={()=>setColor(value)} disabled={busy}/>)}</div></div>
  <div className="photo-widths" role="group" aria-label="線の太さ">{Object.entries(annotationWidths).map(([value,label])=><button type="button" key={value} aria-pressed={width===Number(value)} disabled={busy} onClick={()=>setWidth(Number(value))}><span style={{height:Number(value)/2}}/>{label}</button>)}</div>
  <figure className="photo-markup-image"><img src={photo.url} alt="元画像" draggable={false}/>{!original&&<svg className="photo-markup-overlay" aria-label="写真に線や印を描く" viewBox="0 0 1000 1000" preserveAspectRatio="none" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel}>
   <defs>{Object.keys(annotationColors).map(value=><marker key={value} id={`photo-arrow-${value.slice(1)}`} markerWidth="14" markerHeight="14" refX="10" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke={value} strokeWidth="2"/></marker>)}</defs>
   {marks.map((mark,index)=><Shape key={index} mark={mark}/>)}{draft&&<Shape mark={draft}/>}</svg>}</figure>
  <div className="photo-markup-actions"><button type="button" onClick={()=>setOriginal(value=>!value)}>{original?'書き込みありを見る':'元画像を見る'}</button><button type="button" disabled={!marks.length||busy} onClick={()=>setMarks(previous=>previous.slice(0,-1))}>1つ戻す</button><button type="button" disabled={!marks.length||busy} onClick={()=>setMarks([])}>印を消す</button></div>
  <p className="muted">元画像は変更しません。線と印は写真に重ねて保存します。</p>
 </section>;
}
