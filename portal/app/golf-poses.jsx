'use client';
import {useId,useState} from 'react';
import {renderGolfFigure} from '../../src/domain/quality-overlay.mjs';
const poses={address:'アドレス',impact:'インパクト',follow:'フォロー'};
export default function GolfPoses({scores={},rules={},theme,onRegion,connection}){
 const [pose,setPose]=useState('address');const prefix=useId();
 return <section className="golf-poses"><h3>ゴルフの姿勢</h3><div className="toggles body-tabs" role="group" aria-label="ゴルフの局面">{Object.entries(poses).map(([key,label])=><button type="button" key={key} aria-pressed={pose===key} onClick={()=>setPose(key)}>{label}</button>)}</div><div className="golf-pair">{['front','back'].map(view=><div key={view} onClick={e=>{const hit=e.target.closest?.('.golf-region');if(hit)onRegion?.(hit.dataset.region);}} dangerouslySetInnerHTML={{__html:renderGolfFigure(pose,view,scores,rules,prefix,connection)}}/>)}</div></section>;
}
