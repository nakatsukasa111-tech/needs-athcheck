import { exerciseProposals } from '../lib/exercise-view.mjs';
import ExerciseForm from './staff/exercise-form';
import ExercisePicker from './staff/exercise-picker';
import {tagLabel} from '../lib/exercise-tags.mjs';
export default async function ExerciseSection({db,row,score,staff=false}){
 const selected=await db.from('athlete_exercise_assignments').select('lesson_id,trainer_note,confirmed').eq('measurement_id',row.id).eq('company_id',row.company_id);
 if(selected.error)throw Error('教材の提案を読み込めませんでした。');
 let query=db.from('athlete_lessons').select('id,title,tags,source_approved,demo_approved,member_enabled,member_url,company_id').eq('company_id',row.company_id);
 if(!staff)query=query.in('id',selected.data.map(a=>a.lesson_id));
 const lessons=selected.data.length||staff?await query:{data:[]};
 if(lessons.error)throw Error('教材を読み込めませんでした。');
 let candidates=[];
 if(staff){const rules=await db.from('athlete_exercise_rules').select('*').eq('company_id',row.company_id);if(rules.error)throw Error('提案ルールを読み込めませんでした。');candidates=exerciseProposals(row.company_id,row,score,lessons.data,rules.data);}
 const shown=staff?lessons.data.filter(l=>selected.data.some(a=>a.lesson_id===l.id)||candidates.some(c=>c.lessonId===l.id)):lessons.data;
 return <section className="card"><h2>{staff?'メソッドブックの教材提案':'担当トレーナーからのエクササイズ'}</h2>{staff&&<p>測定結果から最大5件を提案します。対応する教材が少ない場合は、その件数だけ表示します。内容・実施条件を確認して選んでください。確定した教材は、測定結果の公開後に本人へ表示されます。</p>}{!shown.length&&<p>{staff?'今回の測定に一致する候補はありません。未測定・0点は自動提案せず、担当者が判断します。':'担当トレーナーがエクササイズを確認しています。'}</p>}{shown.map(l=>{const a=selected.data.find(a=>a.lesson_id===l.id),c=candidates.find(c=>c.lessonId===l.id);return <article className="exercise" key={l.id}><h3>{l.title}</h3>{staff&&<p className="muted">{a?.confirmed?"選択済み・本人向け確定":a?"選択済み・候補保存":"自動推奨・未選択"}</p>}{l.demo_approved&&!l.source_approved&&<p className="muted">デモ用教材（説明・分類は調整中）</p>}{l.member_url&&<a href={l.member_url} target="_blank" rel="noopener noreferrer">教材を見る{l.demo_approved?'（デモ版）':''} ↗</a>}{staff?<><p className="muted">{l.tags.map(tagLabel).join(' / ')}</p>{c&&<details><summary>推奨の根拠（{c.reasons.length}項目）</summary><ul>{c.reasons.map(r=><li key={r.ruleId}>{r.text}（{r.value}点）</li>)}</ul>{!c.ruleApproved&&<p className="muted">対応ルールは監修待ちです。担当者が内容を確認して確定してください。</p>}</details>}<ExerciseForm measurementId={row.id} lesson={l} assignment={a}/></>:<p>{a?.trainer_note||'回数・頻度は担当トレーナーに確認してください。'}</p>}</article>;})}{staff&&<ExercisePicker lessons={lessons.data} measurementId={row.id} selectedIds={shown.map(l=>l.id)}/>}</section>;
}
