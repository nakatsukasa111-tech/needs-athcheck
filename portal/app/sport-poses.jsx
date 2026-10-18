'use client';
import {useEffect,useId,useState} from 'react';
import {imageReady} from '../../src/domain/image-ready.mjs';
import {sportPoses,renderSportFigure} from '../../src/domain/sport-poses.mjs';
import GolfPoses from './golf-poses';
export default function SportPoses(props){return props.sport==='golf'?<GolfPoses {...props}/>:<OtherSport key={props.sport} {...props}/>;}
function OtherSport({sport,sex,profile={},scores={},rules={},assessments,onRegion}){
 const [phase,setPhase]=useState(0),[hand,setHand]=useState((sport==='baseball-batter'?profile.batting_hand:profile.throwing_hand)==='L'?'L':'R'),[ready,setReady]=useState(''),[error,setError]=useState(false),[retry,setRetry]=useState(0);const prefix=useId(),spec=sportPoses[sport],src='/sports/'+sport+'/'+(sex==='F'?'female':'male')+'.png';
 useEffect(()=>{let active=true;setError(false);imageReady(src).then(()=>{if(active)setReady(src);}).catch(()=>{if(active)setError(true);});return ()=>{active=false;};},[src,retry]);
 return <section className="golf-poses"><h3>{spec.label}の姿勢</h3><div className="toggles" role="group" aria-label="競技動作の左右">{['R','L'].map(h=><button type="button" key={h} aria-pressed={hand===h} onClick={()=>setHand(h)}>{h==='R'?'右':'左'}</button>)}</div><div className="toggles body-tabs" role="group" aria-label="競技の場面">{spec.phases.map((label,i)=><button type="button" key={label} aria-pressed={phase===i} onClick={()=>setPhase(i)}>{label}</button>)}</div>{ready!==src&&<p role="status">{error?<><span>線画を読み込めませんでした。</span><button type="button" onClick={()=>setRetry(n=>n+1)}>再読込</button></>:'線画を読み込み中…'}</p>}<div className="golf-pair" aria-busy={ready!==src}>{ready===src&&['front','back'].map(view=><div key={view} onClick={e=>{const hit=e.target.closest?.('.golf-region');if(hit)onRegion?.(hit.dataset.region);}} dangerouslySetInnerHTML={{__html:renderSportFigure(sport,phase,view,scores,rules,prefix,assessments,sex,hand==='L')}}/>)}</div></section>;
}
