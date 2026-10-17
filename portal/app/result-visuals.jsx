'use client';
import { useId, useState } from 'react';
import ResultTrend from './result-trend';
import GolfPoses from './golf-poses';
import ResultInsights from './result-insights';
import { palette,scoreColor } from '../lib/chart-colors.mjs';
import { bodyRegions,bodyThemes,createBodyRenderer } from '../../src/domain/bodymap.mjs';
const cats={flex:'柔軟性',balance:'バランス',strength:'筋力',jump:'ジャンプ',quality:'動きの質'};
const fmt=v=>v==null?'未測定':`${Math.round(v*10)/10}`;
function Radar({axes,title,rules}){
 const p=(i,v)=>{const a=i*2*Math.PI/axes.length-Math.PI/2;return [180+Math.cos(a)*v*1.05,165+Math.sin(a)*v*1.05];};
 return <div className="radar-wrap"><svg className="radar" viewBox="-16 -10 392 355" role="img" aria-label={title}>
  {[25,50,75,100].map(v=><g key={v}><polygon points={axes.map((_,i)=>p(i,v).join(',')).join(' ')} fill="none" stroke="#D5D8DC"/><text x="184" y={165-v*1.05} fontSize="11" fill="#8A8F98">{v}</text></g>)}
  {axes.map((a,i)=><g key={a.label}><line x1="180" y1="165" x2={p(i,100)[0]} y2={p(i,100)[1]} stroke="#D5D8DC"/><text x={p(i,132)[0]} y={p(i,128)[1]} textAnchor="middle" fontSize="15" fontWeight="600">{(a.lines??[a.label]).map((line,j)=><tspan key={j} x={p(i,132)[0]} dy={j===0?0:17}>{line}</tspan>)}</text></g>)}
  <polygon points={axes.map((a,i)=>p(i,a.value??0).join(',')).join(' ')} fill="#11182716" stroke="#20252B" strokeWidth="2"/>
  {axes.map((a,i)=>a.value!=null&&<circle key={i} cx={p(i,a.value)[0]} cy={p(i,a.value)[1]} r="5" fill={scoreColor(a.value,rules)} stroke="white" strokeWidth="1.5"/>)}</svg>
  <details className="chart-detail"><summary>グラフの数値・説明</summary><ul className="chart-values">{axes.map(a=><li key={a.label}>{a.label}：{fmt(a.value)}{a.value!=null?' / 100':''}{a.tip&&`（${a.tip}）`}</li>)}</ul></details>
 </div>;
}
function Bars({rows,points=false,rules={}}){
 const threshold=(key,fallback)=>rules[key]!==undefined&&rules[key]!==''&&Number.isFinite(Number(rules[key]))?Number(rules[key]):fallback;
 const yellow=threshold('flex_yellow_min',66.7),green=threshold('flex_green_min',88.9);
 const ticks=points?[0,100/3,200/3,100]:[0,yellow,green,100];
 return <div className={`bar-list ${points?'item-bars':'summary-bars'}`}>{rows.map((r,i)=><div className="bar-row" key={i}>
  <div className="bar-label"><strong>{r.label}</strong><span>{r.text}</span></div>
  <div className="bar-score-row"><div className="score-bar"><span style={{width:`${r.value??0}%`,background:r.color}}/>{ticks.slice(1,-1).map(v=><i key={v} className="bar-tick" style={{left:`${v}%`}}/>)}</div><strong className="bar-score">{r.value==null?'—':fmt(points?r.points:r.value)}<small> / {points?3:100}</small></strong></div>
 </div>)}<div className="bar-guide"><div className="bar-scale">{ticks.map((v,i)=><span key={i} style={{left:`${v}%`}}>{points?i:fmt(v)}</span>)}</div><div className="bar-bands">{points?<><span>1点：要改善</span><span>2点：普通</span><span>3点：良好</span></>:<><span>要改善：{yellow}未満</span><span>普通：{yellow}〜</span><span>良好：{green}〜</span></>}</div></div></div>;
}
function Legend(){return <div className="chart-legend"><span><i style={{background:palette.red}}/>要改善</span><span><i style={{background:palette.amber}}/>普通</span><span><i style={{background:palette.green}}/>良好</span><span><i style={{background:palette.gray}}/>未測定</span></div>;}
export default function ResultVisuals({score,sex,rules={},history=[]}){
 const [theme,setTheme]=useState('flex'),[region,setRegion]=useState('');
 const prefix=useId();const draw=createBodyRenderer(rules,prefix);
 if(!score)return null;
 const body=score.body?.[theme]??{score:{},basis:{}};
 const sexLabel=sex==='M'?'男性':sex==='F'?'女性':'中性';
 const label=k=>{const [r,s]=k.split('|');return `${bodyRegions.find(b=>b.key===r)?.label??r}${s==='R'?'・右':s==='L'?'・左':''}`;};
 return <>
  <section className="card"><h2>測定バランス</h2><div className="chart-layout overview-chart"><Bars rules={rules} rows={Object.entries(cats).map(([key,label])=>({label,value:score.cats[key],text:score.cats[key]==null?'未測定':'',color:scoreColor(score.cats[key],rules)}))}/><Radar title="5部門の得点率" rules={rules} axes={Object.entries(cats).map(([key,label])=>({label,value:score.cats[key]}))}/></div><Legend/><p className="muted">未測定の軸は図の中心に置いています。総合点の計算には含めません。</p></section>
  <section className="card"><div className="section-heading"><h2>部位別コンディション</h2><span className="body-type">{sexLabel}のボディマップ</span></div><p className="muted">測定した項目から、どの部位に出ているかを表示しています。部位を選ぶと評価の根拠を確認できます。</p><div className="toggles body-tabs" role="group" aria-label="ボディマップの切り替え">{bodyThemes.map(t=><button key={t.key} aria-pressed={theme===t.key} onClick={()=>{setTheme(t.key);setRegion('');}}>{t.label}</button>)}</div>
   <div className="body-pair">{['front','back'].map(view=><figure key={view}><figcaption>{view==='front'?'正面':'背面'}<small>{view==='front'?'向かって左が本人の「右」':'向かって右が本人の「右」'}</small></figcaption><div aria-label={`${sexLabel}・${view==='front'?'正面':'背面'}`} onClick={e=>{const hit=e.target.closest?.('.bodyHit');if(hit)setRegion(`${hit.dataset.k}|${hit.dataset.s}`);}} dangerouslySetInnerHTML={{__html:draw(view,sex,body.score)}}/></figure>)}</div>
   <Legend/><p className="muted">無色は未測定です。部位の対応は暫定です。総合点には影響しません。</p><label>部位と評価の根拠<select value={region} onChange={e=>setRegion(e.target.value)}><option value="">部位を選択</option>{Object.keys(body.score).map(k=><option key={k} value={k}>{label(k)}：{fmt(body.score[k])}</option>)}</select></label>{region&&<div role="status"><h3>{label(region)}：{fmt(body.score[region])}</h3>{(body.basis[region]??[]).length?<ul>{body.basis[region].map((b,i)=><li key={i}>{b.name}：{b.pt} / 3点（寄与 {b.w}）</li>)}</ul>:<p>この部位の測定はありません。</p>}</div>}
  </section>
  {Object.entries(cats).map(([key,name])=>{const items=score.items.filter(i=>i.cat===name);return <section className="card" key={key}><div className="section-heading"><h2>{name}</h2><strong className="category-score" style={{color:scoreColor(score.cats[key],rules)}}>{fmt(score.cats[key])}{score.cats[key]!=null&&<small> / 100</small>}</strong></div>{items.length?<div className={`chart-layout ${score.radars[key]?'':'bars-only'}`}>{score.radars[key]&&<Radar title={`${name}の部位別評価`} axes={score.radars[key]} rules={rules}/>}<div><Bars points rows={items.map(i=>({label:i.short??i.name,text:i.val,points:i.kind==='pts'?i.raw:i.pt,value:Math.round((i.kind==='pts'?i.raw:i.pt)/3*1000)/10,color:palette[i.color]??palette.gray}))}/><Legend/></div></div>:<p className="muted">この部門はまだ測定されていません。</p>}</section>;})}
  <section className="card"><GolfPoses/></section>
  <ResultInsights score={score} rules={rules}/>
  <ResultTrend history={history} rules={rules}/>
 </>;
}
