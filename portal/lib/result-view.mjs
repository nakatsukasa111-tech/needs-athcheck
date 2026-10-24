import {scoreMode,modeForVersion,modeValues} from './measurement-modes.mjs';
export function recordSettings(row,settings){return row.saved_score?.configuration?.settings??settings;}
export function scoreRecord(row,settings){
 const mode=modeForVersion(row.definition_version),effective=recordSettings(row,settings);
 if(!effective||!mode)return null;
 return scoreMode(row.values,{sex:row.threshold_sex,band:row.age_band,weight:row.weight==null?undefined:Number(row.weight),est:Object.fromEntries((row.estimated_items??[]).map(k=>[k,true]))},effective,mode.id);
}
export function historyView(rows,settings,version){return rows.filter(r=>!version||r.definition_version===version).map(r=>({id:r.id,date:r.measured_on,version:r.definition_version,score:scoreRecord(r,settings),values:modeForVersion(r.definition_version)?modeValues(r.values,modeForVersion(r.definition_version).id):{},estimated:r.estimated_items??[]}));}
