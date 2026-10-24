'use client';
import {useEffect,useRef,useState} from 'react';
import MeasurementFields from '../../staff/measurement-fields';
import ModeSelector from '../../staff/mode-selector';
import {PhotoCapture} from '../../staff/photo-panel';
import ResultVisuals from '../../result-visuals';
import {measurementInput} from '../../../lib/measurement-input.mjs';
import {createDemoMeasurement} from '../../../lib/demo-measurement.mjs';
import {getMode} from '../../../lib/measurement-modes.mjs';
export default function PreviewMeasure({settings,today}){
 const [open,setOpen]=useState(false),[mode,setMode]=useState('athlete'),[result,setResult]=useState(null),[error,setError]=useState(''),[sex,setSex]=useState('M');
 const form=useRef(null),lastDemo=useRef(null),resultArea=useRef(null);
 useEffect(()=>{if(result)resultArea.current?.scrollIntoView({block:'start'});},[result]);
 function fill(){const data=createDemoMeasurement(lastDemo.current);lastDemo.current=data;const fields=form.current.elements;fields.namedItem('weight').value=data.weight;for(const [key,value]of Object.entries(data.values)){const el=fields.namedItem('value:'+key);if(el&&!el.disabled)el.value=value;}if(mode==='basic')fields.namedItem('value:chair_stand_30').value=8+Math.floor(Math.random()*18);setResult(null);}
 function analyze(e){e.preventDefault();setError('');try{const row=measurementInput(new FormData(form.current),{birth_date:'1990-01-01',threshold_sex:sex},settings);setResult(row);}catch(e){setError(e.message);}}
 return <><h1>3モードの測定・結果プレビュー</h1><p className="muted">架空データで入力・分析・写真操作を確認できます。サーバーには保存しません。公開済みの判定マスターを使った見本です。</p>
 <form ref={form} onSubmit={analyze} onChange={()=>setResult(null)}><ModeSelector mode={mode} onChange={setMode}/><section className="card"><div className="grid"><label>測定日<input type="date" name="measured_on" defaultValue={today} max={today} required/></label><label>評価基準の性別<select value={sex} onChange={e=>setSex(e.target.value)}><option value="M">男性</option><option value="F">女性</option></select></label><label>測定日の体重（kg）<input name="weight" type="number" min="0.01" step="any" defaultValue="65"/></label></div><button type="button" onClick={fill}>デモ数値を入れる</button></section>
 <div className="measurement-photo-link"><button type="button" onClick={()=>setOpen(true)}>写真を追加</button><button type="submit">分析結果を表示</button></div><MeasurementFields mode={mode}/><section className="card">{error&&<p role="alert" className="error">{error}</p>}<button type="submit">分析結果を表示</button></section></form>
 {open&&<PhotoCapture mode={mode} onClose={()=>setOpen(false)} preview/>}
 {result&&<div id="preview-results" ref={resultArea}><section className="card"><h2>{getMode(mode).label}の分析結果</h2><p>{mode==='athlete'?'アスリート基準':'アスリート基準による暫定判定'}</p><div className="score">{result.saved_score.measured?result.saved_score.total:'—'}<small> / 100</small></div></section><ResultVisuals key={mode} mode={mode} score={result.saved_score} sex={sex} rules={settings.rules}/></div>}</>;
}
