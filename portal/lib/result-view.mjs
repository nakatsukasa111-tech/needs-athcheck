import { createAthleteScorer } from '../../src/domain/athlete-scoring.mjs';
export function scoreRecord(row,settings){
  if(!settings||row.definition_version!=='athlete-v1')return null;
  return createAthleteScorer(settings).score(row.values,{sex:row.threshold_sex,band:row.age_band,weight:row.weight==null?undefined:Number(row.weight),est:Object.fromEntries((row.estimated_items??[]).map(k=>[k,true]))});
}
export function historyView(rows,settings){return rows.map(r=>({id:r.id,date:r.measured_on,score:scoreRecord(r,settings),values:r.definition_version==='athlete-v1'?r.values:{},estimated:r.estimated_items??[]}));}
