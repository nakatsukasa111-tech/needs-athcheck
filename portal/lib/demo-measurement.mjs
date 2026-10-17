import {athlete} from './measurement-input.mjs';
// Explicitly approved members only. A matching display name never enables this.
export function canFillDemo(member){return ['3b3b9a22-b335-4cda-8c4c-f14901036abd','d97c5190-57e9-50f7-af7c-64eedeb66b08','64992d17-7f10-5a69-aba4-883c40b0d219'].includes(member?.id)&&member.company_id==='78318e46-276c-48a2-b6d4-b0fa279671fe';}
export function createDemoMeasurement(previous,random=Math.random){
 const integer=(min,max)=>min+Math.floor(random()*(max-min+1));
 const decimal=(min,max)=>integer(min*10,max*10)/10;
 const weight=integer(55,85),values={};
 const ranges={sl_stance:[8,60],ground_touch_bal:[3,18],ab30s:[12,35],pl_basic:[6,30],pushup:[6,35],chinup:[1,15],sl_sq:[3,20]};
 const ratios={bp_1rm:[.5,1.5],sq_1rm:[.8,2],dl_1rm:[1,2.3]};
 for(const key of athlete.fields){
  const d=athlete.definitions[key];
  if(d.kind==='pts')values[key]=integer(1,3);
  else if(ranges[d.key])values[key]=integer(...ranges[d.key]);
  else if(ratios[d.key])values[key]=Math.round(weight*decimal(...ratios[d.key])*2)/2;
 }
 values.sqj=decimal(18,40);values.cmj=Math.round(values.sqj*decimal(1,1.3)*10)/10;
 values.abj=Math.round(values.cmj*decimal(1,1.2)*10)/10;
 values.sl_cmj_R=Math.round(values.cmj*decimal(.3,.6)*10)/10;
 values.sl_cmj_L=Math.round(values.cmj*decimal(.3,.6)*10)/10;
 values.hop_rsi=decimal(.8,3.2);values.drop_rsi=decimal(.8,3.5);
 // Even an identical random draw must change the set on consecutive clicks.
 if(previous&&weight===previous.weight&&athlete.fields.every(k=>values[k]===previous.values[k]))values[athlete.fields[0]]=values[athlete.fields[0]]%3+1;
 return {weight,values};
}
