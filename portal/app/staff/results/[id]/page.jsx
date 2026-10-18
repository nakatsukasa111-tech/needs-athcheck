import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '../../../../lib/staff';
import { PublicationForm } from '../../forms';
import { scoreRecord,historyView } from '../../../../lib/result-view.mjs';
import ResultVisuals from '../../../result-visuals';
import ExerciseSection from '../../../exercise-section';
export const dynamic='force-dynamic';
export default async function StaffResult({params}){
  const {id}=await params; const {db,staff}=await requireStaff();
  const result=await db.from('athlete_measurements').select('*').eq('id',id).in('company_id',staff.map(s=>s.company_id)).maybeSingle();
  if(result.error)throw new Error('測定結果を読み込めませんでした'); if(!result.data)notFound();
  const r=result.data;
  const [settings,history]=await Promise.all([db.from('athlete_scoring_settings').select('thresholds,rules').eq('company_id',r.company_id).maybeSingle(),db.from('athlete_measurements').select('*').eq('company_id',r.company_id).eq('member_id',r.member_id).order('measured_on').order('created_at')]);
  if(settings.error||history.error)throw Error('評価基準・履歴を読み込めませんでした');
  const current=scoreRecord(r,settings.data),score=current??r.saved_score;
  const profile=await db.from('athlete_members').select('sport,sport_other,sport_role,throwing_hand,batting_hand').eq('id',r.member_id).eq('company_id',r.company_id).single();
  if(profile.error)throw Error('競技プロフィールを読み込めませんでした');
  return <><Link href={`/staff/members/${r.member_id}`}>会員の測定履歴へ</Link><h1>{r.measured_on} の測定結果</h1><Link href={`/staff/members/${r.member_id}/photos?record=${id}`}>この測定の写真を見る →</Link><p role="status">{r.published?'本人に公開済み':'下書き：本人にはまだ表示されません。'}</p><section className="card"><h2>{current?'現在の基準の総合スコア':'保存時の総合スコア'}</h2><div className="score">{score.measured?score.total:'—'}<small> / 100</small></div><p>保存時：{r.saved_score.measured?r.saved_score.total:'—'}点 ／ 測定日の体重：{r.weight??'未入力'} kg</p></section>
  <ResultVisuals profile={profile.data} score={current} sex={r.threshold_sex} rules={settings.data?.rules} history={historyView(history.data,settings.data)}/>
  <ExerciseSection db={db} row={r} score={current} staff/>
  <section className="card"><h2>測定内容</h2><table><thead><tr><th>項目</th><th>結果</th></tr></thead><tbody>{(score.items??[]).map((item,i)=><tr key={i}><td>{item.name}</td><td>{item.val}</td></tr>)}</tbody></table></section><section className="card"><h2>本人に公開するコメント</h2><p>{r.public_comment||'コメントなし'}</p><PublicationForm id={id} published={r.published}/></section></>;
}
