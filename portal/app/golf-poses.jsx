'use client';
import PoseControls from './pose-controls';
import {useEffect,useId,useState} from 'react';
import {renderGolfFigure} from '../../src/domain/quality-overlay.mjs';
import {imageReady} from '../../src/domain/image-ready.mjs';
const poses={address:'アドレス',impact:'インパクト',follow:'フォロー'};
export default function GolfPoses({scores={},rules={},theme,onRegion,assessments,sex,profile={},onSport}){
 const [hand,setHand]=useState(profile.batting_hand==='L'?'L':'R');const assetRoot='/golf/'+(sex==='F'?'female':'male')+'/';
 const [pose,setPose]=useState('address'),[ready,setReady]=useState(''),[error,setError]=useState(false),[retry,setRetry]=useState(0);const prefix=useId();
 const src=assetRoot+pose+'.png';
 useEffect(()=>{let active=true;setError(false);imageReady(src).then(()=>{if(active)setReady(src);}).catch(()=>{if(active)setError(true);});return ()=>{active=false;};},[src,retry]);
 return <section className="golf-poses"><PoseControls sport="golf" onSport={onSport} hand={hand} onHand={setHand}/><div className="toggles body-tabs" role="group" aria-label="ゴルフの局面">{Object.entries(poses).map(([key,label])=><button type="button" key={key} aria-pressed={pose===key} onClick={()=>setPose(key)}>{label}</button>)}</div>{ready!==src&&<p role="status">{error?<><span>線画を読み込めませんでした。</span><button type="button" onClick={()=>setRetry(n=>n+1)}>再読込</button></>:'読み込み中'}</p>}<div className="golf-pair" aria-busy={ready!==src} style={{visibility:ready===src?'visible':'hidden'}}>{ready===src&&['front','back'].map(view=><div key={view} onClick={e=>{const hit=e.target.closest?.('.golf-region');if(hit)onRegion?.(hit.dataset.region);}} dangerouslySetInnerHTML={{__html:renderGolfFigure(pose,view,scores,rules,prefix,assessments,assetRoot,hand==='L')}}/>)}</div></section>;
}
