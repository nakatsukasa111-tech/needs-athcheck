'use client';
import {useState} from 'react';
import MeasurementFields from '../../staff/measurement-fields';
import {PhotoCapture} from '../../staff/photo-panel';
export default function PreviewMeasure(){const [field,setField]=useState(null);return <><h1>測定画面の見本</h1><p className="muted">写真の選択と区分切り替えを試せます。この見本では写真・測定値は保存されません。実際の保存はスタッフ画面で行います。</p><MeasurementFields onPhoto={setField}/>{field&&<PhotoCapture fieldKey={field} onClose={()=>setField(null)} preview/>}</>;}
