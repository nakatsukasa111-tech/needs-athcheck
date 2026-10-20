'use client';
import {fieldLabel} from '../../lib/photo-input.mjs';
import {athlete} from '../../lib/measurement-input.mjs';
export const stamp=value=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
export function TestSelect({value,onChange,all=false,disabled=false}){
 return <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}><option value="">{all?'すべて':'-'}</option>{athlete.fields.map(key=><option value={key} key={key}>{fieldLabel(key)}</option>)}</select>;
}
