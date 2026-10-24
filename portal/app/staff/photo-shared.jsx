'use client';
import {fieldLabel} from '../../lib/photo-input.mjs';
import {allFields,getMode} from '../../lib/measurement-modes.mjs';
export const stamp=value=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
export function TestSelect({value,onChange,all=false,disabled=false,mode}){
 return <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}><option value="">{all?'すべて':'-'}</option>{(mode?getMode(mode).fields:allFields).map(key=><option value={key} key={key}>{fieldLabel(key)}</option>)}</select>;
}
