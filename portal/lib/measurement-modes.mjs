import {createAthleteScorer} from '../../src/domain/athlete-scoring.mjs';

const athlete = createAthleteScorer();
export const categories = {flex:'柔軟性',balance:'バランス',strength:'筋力',jump:'ジャンプ',quality:'動きの質'};
export const definitions = Object.freeze({...athlete.definitions,
  chair_stand_30:{key:'chair_stand_30',cat:'strength',name:'30秒椅子立ち上がり',kind:'num',unit:'回',integer:true,unscored:true,note:'回数を記録します。対応するアスリート基準がないため、基準設定までは点数・人体図・総合点の対象外です。'},
});
const basicStrength = ['ab30s','pushup'];
const activeStrength = [...basicStrength,'pl_basic','chinup','bp_1rm','sq_1rm'];
const basicFields = athlete.fields.filter(k=>{
  const d=definitions[k];
  return d.cat==='flex'?!['trunk_side','bridge'].includes(d.key):d.cat==='balance'?true:d.cat==='strength'?basicStrength.includes(d.key):d.cat==='quality'?!k.startsWith('pelvic_tilt_')&&!k.startsWith('ssp_'):false;
});
basicFields.splice(basicFields.findIndex(k=>definitions[k].cat==='strength'),0,'chair_stand_30');
const activeFields = athlete.fields.filter(k=>{
  const d=definitions[k];
  return d.cat==='strength'?activeStrength.includes(d.key):d.cat==='jump'?['cmj','hop_rsi','sl_cmj'].includes(d.key):true;
});
// Published sets are immutable: future item changes receive a new version.
export const measurementModes = Object.freeze({
  athlete:Object.freeze({id:'athlete',label:'アスリート',version:'athlete-v1',fields:athlete.fields,sports:true}),
  basic:Object.freeze({id:'basic',label:'一般ベーシック',version:'general-basic-v1',fields:Object.freeze(basicFields),sports:false}),
  active:Object.freeze({id:'active',label:'一般アクティブ',version:'general-active-v1',fields:Object.freeze(activeFields),sports:true}),
});
export const allFields = Object.freeze([...athlete.fields,'chair_stand_30']);
export function getMode(id='athlete') {
  if(!Object.hasOwn(measurementModes,id))throw Error('測定モードを選択してください。');
  return measurementModes[id];
}
export function modeForVersion(version) {return Object.values(measurementModes).find(m=>m.version===version)??null;}
export function modeLabel(version) {return modeForVersion(version)?.label??'旧形式';}
export function modeCategories(id) {const fields=getMode(id).fields;return Object.fromEntries(Object.entries(categories).filter(([cat])=>fields.some(k=>definitions[k].cat===cat)));}
export function modeValues(values,id) {return Object.fromEntries(getMode(id).fields.filter(k=>values[k]!=null&&values[k]!=='').map(k=>[k,values[k]]));}
export function modeSettings(settings,id) {return settings?.modes?.[id]??settings;}
export function scoreMode(values,context,settings,id='athlete') {
  const mode=getMode(id);
  // Legacy athlete records retain their original keys and exact scoring behavior.
  const input=id==='athlete'?values:modeValues(values,id);
  const result=createAthleteScorer(modeSettings(settings,id)).score(input,context);
  if(id==='athlete')return result;
  // General courses omit the unapproved inferred "connections" visualization.
  for(const key of ['flex','strength'])if(result.radars[key])result.radars[key]=result.radars[key].filter(a=>!a.label.includes('つながり'));
  if(id==='active'&&result.radars.jump)result.radars.jump=[
    {...result.radars.jump[0],label:'跳躍高（CMJ）'},result.radars.jump[3],{...result.radars.jump[4],label:'RSI（ホップ）'},
  ];
  if(id==='basic'){
    delete result.cats.jump;delete result.radars.jump;
    if(input.chair_stand_30!=null)result.items.push({cat:'筋力',name:definitions.chair_stand_30.name,kind:'num',color:'gray',unscored:true,val:input.chair_stand_30+' 回（基準未設定・採点対象外）'});
  }
  result.mode=mode.id;
  return result;
}
