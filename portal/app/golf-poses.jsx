'use client';
import { useId, useState } from 'react';
import { renderGolfOverlay } from '../../src/domain/golf-overlay.mjs';
const poses = {address:'アドレス',impact:'インパクト',follow:'フォロー'};
export default function GolfPoses({scores={},rules={},theme,onRegion}){
 const [pose,setPose]=useState('address');const prefix=useId();
 return <section className="golf-poses"><h3>ゴルフの姿勢</h3><div className="toggles body-tabs" role="group" aria-label="ゴルフの局面">{Object.entries(poses).map(([key,label])=><button type="button" key={key} aria-pressed={pose===key} onClick={()=>setPose(key)}>{label}</button>)}</div><figure><div className="golf-map"><img src={`/golf/${pose}.png`} width="1536" height="1024" alt={`右打ち・${poses[pose]}：左が正面側、右が背面側のカメラからの図`}/><div className="golf-overlay" onClick={e=>{const hit=e.target.closest?.('.golf-region');if(hit)onRegion?.(hit.dataset.region);}} dangerouslySetInnerHTML={{__html:renderGolfOverlay(pose,scores,rules,prefix)}}/></div><figcaption>右打ち・{poses[pose]} ｜ 左：正面側 ／ 右：背面側</figcaption></figure><p className="muted">{theme==='quality'?'動きの質の部位対応は未設定です。':'立位図と同じ測定結果を表示しています。無色の部位は未測定です。'}色の位置は姿勢に合わせた目安で、スイング自体の採点ではありません。</p></section>;
}
