'use client';
import {measurementModes,getMode} from '../../lib/measurement-modes.mjs';
export default function ModeSelector({mode,onChange,disabled=false}){
 return <section className="card mode-selector"><div className="section-heading"><label htmlFor="measurement-mode">測定モード</label><span>{getMode(mode).fields.length}項目</span></div><select id="measurement-mode" name="measurement_mode" value={mode} onChange={e=>onChange(e.target.value)} disabled={disabled}>{Object.values(measurementModes).map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select><p className="muted">切り替えても入力中の値は保持します。保存・分析するのは選択中のモードの項目だけです。{mode!=='athlete'&&'一般用はアスリート基準による暫定判定です。'}</p></section>;
}
