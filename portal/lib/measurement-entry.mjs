import {allFields,definitions} from './measurement-modes.mjs';
export function fieldDirection(key){
 if(key.endsWith('_R'))return '右';
 if(key.endsWith('_L'))return '左';
 return {pelvic_tilt_anterior:'前傾',pelvic_tilt_posterior:'後傾',ssp_extension:'伸展',ssp_flexion:'屈曲'}[key]??'';
}
export function measurementGroups(){
 const groups=new Map();
 for(const field of allFields){
  const d=definitions[field];
  const key=field.startsWith('pelvic_tilt_')?'pelvic_tilt':field.startsWith('ssp_')?'ssp':d.key;
  if(!groups.has(key))groups.set(key,{key,cat:d.cat,name:key==='pelvic_tilt'?'ペルビックティルト':key==='ssp'?'SSP連動テスト':d.name,fields:[]});
  groups.get(key).fields.push(field);
 }
 return [...groups.values()];
}
// Empty and zero must remain distinct throughout entry and submission.
export function keypadValue(value,key,{integer=false,replace=false}={}){
 if(key==='clear')return '';
 if(key==='backspace')return value.slice(0,-1);
 if(key==='.')return integer?value:replace||value===''?'0.':value.includes('.')?value:value+'.';
 if(!/^\d$/.test(key))return value;
 const base=replace?'':value;
 if(base.length>=12)return base;
 return base==='0'?key:base+key;
}
export function completedNumber(value){return value.endsWith('.')?value.slice(0,-1):value;}
