import { proposeExerciseCandidates } from '../../src/domain/exercise-candidates.mjs';
import { createAthleteScorer } from '../../src/domain/athlete-scoring.mjs';
const defs=createAthleteScorer().definitions;
// 3点形式は実測値、数値種目は会社基準で算出した点数を使う。0点を自動提案にしない。
export function candidatePoints(row,score){return Object.fromEntries(Object.entries(row.values).map(([k,v])=>[k,v===0?0:defs[k]?.kind==='pts'?v:score?.pts[k]]));}
export function exerciseProposals(companyId,row,score,lessons,rules){
 if(!score||row.definition_version!=='athlete-v1')return [];
 const catalog=lessons.map(l=>({id:l.id,title:l.title,companyId:l.company_id,tags:l.tags,kind:'exercise',reviewStatus:'approved',memberVisible:!!((l.source_approved||l.demo_approved)&&l.member_enabled&&l.member_url)}));
 // スタッフ用の確認候補。公開可否は別途DBで強制する。
 return proposeExerciseCandidates({companyId,values:candidatePoints(row,score),catalog,rules:rules.map(r=>({id:r.id,companyId:r.company_id,field:r.field,maxInclusive:Number(r.max_point),requiredTags:r.tags,lessonIds:r.lesson_ids,reason:r.reason,enabled:true,approved:true}))}).map(c=>({...c,ruleApproved:c.reasons.every(x=>rules.find(r=>r.id===x.ruleId)?.approved),ready:lessons.some(l=>l.id===c.lessonId&&(l.source_approved||l.demo_approved)&&l.member_enabled&&l.member_url)}));
}
