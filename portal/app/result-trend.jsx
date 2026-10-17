'use client';
import {useState} from 'react';
import {scoreColor} from '../lib/chart-colors.mjs';
import {athlete,categories} from '../lib/measurement-input.mjs';
export default function ResultTrend({history,rules={}}){
 const [metric,setMetric]=useState('total');
 const raw=metric.startsWith('raw:'),key=raw?metric.slice(4):metric;
 const unit=raw?athlete.definitions[key].unit:'点';
 const points=history.map(h=>({...h,value:raw?h.values[key]:metric==='total'?(h.score?.measured?h.score.total:null):h.score?.cats[metric]}));
 const max=raw?Math.max(1,...points.map(p=>Number.isFinite(p.value)?p.value:0))*1.1:100;
 const x=i=>40+(points.length===1?260:i*520/(points.length-1)),y=v=>170-v/max*140;
 const format=v=>v==null?'未測定':`${Math.round(v*10)/10} ${unit}`;
 return <section className="card"><h2>測定の推移</h2><label>表示するスコア・実測値<select value={metric} onChange={e=>setMetric(e.target.value)}><optgroup label="スコア"><option value="total">総合スコア</option>{Object.entries(categories).map(([k,v])=><option key={k} value={k}>{v}</option>)}</optgroup><optgroup label="項目ごとの実測値">{athlete.fields.map(k=><option key={k} value={`raw:${k}`}>{athlete.definitions[k].name}{k.endsWith('_R')?' 右':k.endsWith('_L')?' 左':''}（{athlete.definitions[k].unit}）</option>)}</optgroup></select></label>
 {points.length?<><svg className="trend" viewBox="0 0 600 220" role="img" aria-label="測定日ごとのスコア・実測値の推移">{[0,max/2,max].map(v=><g key={v}><line x1="40" x2="565" y1={y(v)} y2={y(v)} stroke="#D5D8DC"/><text x="2" y={y(v)+4} fontSize="11">{Math.round(v*10)/10}</text></g>)}{points.map((p,i)=><g key={p.id}>{i>0&&p.value!=null&&points[i-1].value!=null&&<line x1={x(i-1)} y1={y(points[i-1].value)} x2={x(i)} y2={y(p.value)} stroke="#333940" strokeWidth="3"/>}{p.value!=null&&<circle cx={x(i)} cy={y(p.value)} r="5" fill={scoreColor(raw?Math.round((athlete.definitions[key].kind==='pts'?p.values[key]:p.score?.pts[key])*1000/3)/10:p.value,rules)}><title>{`${p.date}：${format(p.value)}`}</title></circle>}{(points.length<=4||i===0||i===points.length-1)&&<text x={x(i)} y="200" textAnchor="middle" fontSize="11">{p.date}</text>}</g>)}</svg><details><summary>測定日・数値の一覧</summary><ul>{points.map(p=><li key={p.id}>{p.date}：{format(p.value)}{raw&&p.estimated.includes(key)?' ※推定':''}</li>)}</ul></details></>:<p>履歴はまだありません。</p>}
 {points.length===1&&<p>次回の測定後に変化を比較できます。</p>}<p className="muted">スコアは実測値を現在の基準で再計算しています。未測定は0点として扱いません。</p></section>;
}
