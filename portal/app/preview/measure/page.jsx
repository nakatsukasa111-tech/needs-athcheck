'use client';
import {useState} from 'react';
import MeasurementFields from '../../staff/measurement-fields';
import {PhotoCapture} from '../../staff/photo-panel';
export default function PreviewMeasure(){const [open,setOpen]=useState(false);return <><h1>測定画面の見本</h1><p className="muted">写真の選択と区分切り替えを試せます。この見本では写真・測定値は保存されません。実際の保存はスタッフ画面で行います。</p><div className="measurement-photo-link"><button type="button" onClick={()=>setOpen(true)}>写真を追加</button></div><MeasurementFields/>{open&&<PhotoCapture onClose={()=>setOpen(false)} preview/>}</>;}
