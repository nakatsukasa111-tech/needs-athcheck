import {definitions,categories,getMode} from '../../lib/measurement-modes.mjs';
import {measurementGroups,fieldDirection} from '../../lib/measurement-entry.mjs';
import {MeasurementNumber} from './measurement-keypad';
const groups=measurementGroups();
const qualityLabels={1:'十分に行えない',2:'制限・途切れあり',3:'滑らかに行える'};
export default function MeasurementFields({mode='athlete'}){
 const enabled=getMode(mode).fields;
 return <>{Object.entries(categories).map(([cat,label])=><fieldset className="card measurement-category" key={cat} hidden={!enabled.some(k=>definitions[k].cat===cat)}>
  <legend>{label}</legend>
  {cat==='quality'&&<p className="measurement-guide">1：十分に行えない ／ 2：制限・途切れあり ／ 3：滑らかに行える</p>}
  {groups.filter(g=>g.cat===cat).map(g=><section className="measurement-test" key={g.key} hidden={!g.fields.some(k=>enabled.includes(k))} aria-labelledby={`test-${g.key}`}>
   <div className="measurement-test-title"><h3 id={`test-${g.key}`}>{g.name}</h3>{g.fields.length===1&&definitions[g.fields[0]].note&&<p className="muted">{definitions[g.fields[0]].note}</p>}</div>
   <div className={`measurement-directions ${g.fields.length===1?'measurement-single':''}`}>
    {g.fields.map(key=>{const d=definitions[key],direction=fieldDirection(key),label=d.name+(key.endsWith('_R')||key.endsWith('_L')?' '+direction:'');const disabled=!enabled.includes(key);
     return <div key={key} hidden={disabled} className="measurement-entry">
      {d.kind==='pts'?<div role="radiogroup" aria-label={label} className="measurement-rating">
       <div className="measurement-entry-heading"><span>{direction||'判定'}</span><label className="rating-unmeasured"><input type="radio" name={`value:${key}`} value="" defaultChecked disabled={disabled}/><span>未測定</span></label></div>
       <div className="rating-options" style={{'--rating-count':4-(d.min||0)}}>{[0,1,2,3].filter(v=>v>=(d.min||0)).map(v=><label key={v}><input type="radio" name={`value:${key}`} value={v} disabled={disabled} aria-label={`${v}点${cat==='quality'&&v>0?'：'+qualityLabels[v]:''}`}/><span>{v}<small>点</small></span></label>)}</div>
      </div>:<><label htmlFor={key} className="measurement-entry-heading">{direction||'測定値'}<span>{d.unit}</span></label><MeasurementNumber id={key} name={`value:${key}`} label={label} unit={d.unit} integer={d.integer||d.unit==='回'} disabled={disabled}/></>}
      {g.fields.length>1&&['ssp','pelvic_tilt'].includes(g.key)&&d.note&&<p className="muted">{d.note}</p>}
      {d.est&&<label className="check measurement-estimate"><input type="checkbox" name={`estimated:${key}`} disabled={disabled}/>推定1RM</label>}
     </div>;
    })}
   </div>
   {g.fields.length>1&&!['ssp','pelvic_tilt'].includes(g.key)&&definitions[g.fields[0]].note&&<p className="muted measurement-test-note">{definitions[g.fields[0]].note}</p>}
  </section>)}
 </fieldset>)}</>;
}
