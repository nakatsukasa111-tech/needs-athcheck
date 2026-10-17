'use client';
import { useState } from 'react';
const poses = {address:'アドレス',impact:'インパクト',follow:'フォロー'};
export default function GolfPoses(){
 const [pose,setPose]=useState('address');
 return <section className="golf-poses"><h3>ゴルフの姿勢</h3><div className="toggles body-tabs" role="group" aria-label="ゴルフの局面">{Object.entries(poses).map(([key,label])=><button type="button" key={key} aria-pressed={pose===key} onClick={()=>setPose(key)}>{label}</button>)}</div><figure><img src={`/golf/${pose}.png`} width="1536" height="1024" alt={`右打ち・${poses[pose]}：左が正面側、右が背面側のカメラからの図`}/><figcaption>右打ち・{poses[pose]} ｜ 左：正面側 ／ 右：背面側</figcaption></figure><p className="muted">姿勢の参考図です。スイングを測定・採点した結果ではありません。</p></section>;
}
