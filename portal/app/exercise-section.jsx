import { exerciseProposals } from '../lib/exercise-view.mjs';
import ExerciseForm from './staff/exercise-form';
import ExercisePicker from './staff/exercise-picker';
import {methodbookCatalog} from '../lib/methodbook';
import {mergeCatalog,fallbackDimensions,cleanNote} from '../lib/methodbook-data.mjs';
import ExerciseHeading from './exercise-heading';
export default async function ExerciseSection({db,row,score,staff=false}){
 const selected=await db.from('athlete_exercise_assignments').select('lesson_id,trainer_note,confirmed').eq('measurement_id',row.id).eq('company_id',row.company_id);
 if(selected.error)throw Error('教材の提案を読み込めませんでした。');
 let query=db.from('athlete_lessons').select('id,title,tags,source_approved,demo_approved,member_enabled,member_url,company_id').eq('company_id',row.company_id);
 if(!staff)query=query.in('id',selected.data.map(a=>a.lesson_id));
 const lessons=selected.data.length||staff?await query:{data:[]};
 if(lessons.error)throw Error('教材を読み込めませんでした。');
 const catalog=await methodbookCatalog();
 const dimensions=catalog?.dimensions??fallbackDimensions(lessons.data);
 lessons.data=mergeCatalog(lessons.data,catalog);
 let candidates=[];
 if(staff){const rules=await db.from('athlete_exercise_rules').select('*').eq('company_id',row.company_id);if(rules.error)throw Error('提案ルールを読み込めませんでした。');candidates=exerciseProposals(row.company_id,row,score,lessons.data.filter(l=>!l.sourceMissing),rules.data);}
 const shown=staff?lessons.data.filter(l=>selected.data.some(a=>a.lesson_id===l.id)||candidates.some(c=>c.lessonId===l.id)):lessons.data;
 return <section className="card"><h2>ニーズからの推奨エクササイズ</h2>{staff&&<p className="muted">測定結果から最大5件を提案します。下書き保存は選手に非表示です。「選手に公開」で確定し、測定結果の公開後に表示されます。</p>}{staff&&!catalog&&<p role="status">分類の最新情報を取得できないため、保存済みの分類を表示しています。</p>}{staff&&lessons.data.some(l=>l.sourceMissing)&&<p role="status">メソッドブックで確認できない教材があります。保存済みの内容は保持していますが、新しい推奨候補からは除外しています。</p>}{!shown.length&&<p>{staff?'今回の測定に一致する候補はありません。':'担当トレーナーがエクササイズを確認しています。'}</p>}{shown.map(l=>{const a=selected.data.find(a=>a.lesson_id===l.id),c=candidates.find(c=>c.lessonId===l.id);return <article className="exercise" key={l.id}><ExerciseHeading lesson={l} dimensions={dimensions}/><div className="exercise-reason">{c?<details><summary>推奨の根拠：{c.reasons[0]?.text}{c.reasons.length>1?' ほか'+(c.reasons.length-1)+'項目':''}</summary><ul>{c.reasons.map(r=><li key={r.ruleId}>{r.text}（{r.value}点）</li>)}</ul>{!c.ruleApproved&&<p>担当者が内容を確認して確定してください。</p>}</details>:<span>推奨の根拠：担当者が選択</span>}</div>{staff?<ExerciseForm measurementId={row.id} lesson={l} assignment={a}/>:<p className="exercise-note">{cleanNote(a?.trainer_note)||'回数・頻度は担当トレーナーと確認してください。'}</p>}</article>;})}<p className="muted">※実施内容、回数は担当トレーナーと確認してください</p>{staff&&<ExercisePicker lessons={lessons.data} dimensions={dimensions} measurementId={row.id} selectedIds={shown.map(l=>l.id)}/>}</section>;
}
