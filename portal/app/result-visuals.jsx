'use client';
import { useId, useState } from 'react';
import ResultTrend from './result-trend';
import { bodyRegions,bodyThemes,createBodyRenderer } from '../../src/domain/bodymap.mjs';
const cats={flex:'柔軟性',balance:'バランス',strength:'筋力',jump:'ジャンプ',quality:'動きの質'};
const fmt=v=>v==null?'未測定':`${Math.round(v*10)/10}点`;
function Radar({axes,title}){
  const p=(i,v)=>{const a=i*2*Math.PI/axes.length-Math.PI/2;return [180+Math.cos(a)*v*1.05,160+Math.sin(a)*v*1.05];};
  return <><svg className="radar" viewBox="0 0 360 320" role="img" aria-label={title}>{[25,50,75,100].map(v=><polygon key={v} points={axes.map((_,i)=>p(i,v).join(',')).join(' ')} fill="none" stroke="#d9e4de"/>)}{axes.map((a,i)=><g key={a.label}><line x1="180" y1="160" x2={p(i,100)[0]} y2={p(i,100)[1]} stroke="#d9e4de"/><text x={p(i,132)[0]} y={p(i,128)[1]} textAnchor="middle" fontSize="11">{(a.lines??[a.label]).map((line,j)=><tspan key={j} x={p(i,132)[0]} dy={j===0?0:13}>{line}</tspan>)}</text></g>)}<polygon points={axes.map((a,i)=>p(i,a.value??0).join(',')).join(' ')} fill="#176a5030" stroke="#176a50" strokeWidth="2"/>{axes.map((a,i)=>a.value!=null&&<circle key={i} cx={p(i,a.value)[0]} cy={p(i,a.value)[1]} r="4" fill="#176a50"/>)}</svg><ul className="chart-values">{axes.map(a=><li key={a.label}>{a.label}：{fmt(a.value)}{a.tip&&`（${a.tip}）`}</li>)}</ul></>;
}
export default function ResultVisuals({score,sex,rules={},history=[]}){
 const [theme,setTheme]=useState('flex'),[region,setRegion]=useState('');
 const prefix=useId();const draw=createBodyRenderer(rules,prefix);
 if(!score)return null;
 const body=score.body?.[theme]??{score:{},basis:{}};
 const label=k=>{const [r,s]=k.split('|');return `${bodyRegions.find(b=>b.key===r)?.label??r}${s==='R'?'・右':s==='L'?'・左':''}`;};
 return <>
 <section className="card"><h2>測定バランス</h2><Radar title="5部門の得点率" axes={Object.entries(cats).map(([key,label])=>({label,value:score.cats[key]}))}/><p className="muted">未測定の軸は図の中心に置いています。総合点の計算には含めません。</p></section>
 <section className="card"><h2>ボディマップ</h2><div className="toggles" role="group" aria-label="ボディマップの切り替え">{bodyThemes.map(t=><button key={t.key} aria-pressed={theme===t.key} onClick={()=>{setTheme(t.key);setRegion('');}}>{t.label}</button>)}</div><div className="body-pair">{['front','back'].map(view=><figure key={view}><figcaption>{view==='front'?'前面':'背面'}</figcaption><div onClick={e=>{const hit=e.target.closest?.('.bodyHit');if(hit)setRegion(`${hit.dataset.k}|${hit.dataset.s}`);}} dangerouslySetInnerHTML={{__html:draw(view,sex,body.score)}}/></figure>)}</div><p className="muted">緑・黄・赤は現在の基準による評価、無色は未測定です。部位の対応は暫定です。総合点には影響しません。</p><label>部位と評価の根拠<select value={region} onChange={e=>setRegion(e.target.value)}><option value="">部位を選択</option>{Object.keys(body.score).map(k=><option key={k} value={k}>{label(k)}：{fmt(body.score[k])}</option>)}</select></label>{region&&<div role="status"><h3>{label(region)}：{fmt(body.score[region])}</h3>{(body.basis[region]??[]).length?<ul>{body.basis[region].map((b,i)=><li key={i}>{b.name}：{b.pt} / 3点（寄与 {b.w}）</li>)}</ul>:<p>この部位の測定はありません。</p>}</div>}</section>
 <ResultTrend history={history}/>
 {Object.entries(cats).map(([key,name])=><section className="card" key={key}><h2>{name}：{fmt(score.cats[key])}</h2><div className="score-bar"><span style={{width:`${score.cats[key]??0}%`}}/></div>{score.radars[key]&&<Radar title={`${name}の部位別評価`} axes={score.radars[key]}/>}</section>)}
 </>;
}
