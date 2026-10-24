import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '../../../../lib/supabase';
import {modeForVersion} from '../../../../lib/measurement-modes.mjs';
import ResultVisuals from '../../../result-visuals';
import ExerciseSection from '../../../exercise-section';
import { historyView,scoreRecord,recordSettings } from '../../../../lib/result-view.mjs';
export const dynamic = 'force-dynamic';
export default async function Result({ params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { db, user } = await requireUser();
  const access = await db.from('athlete_member_access').select('member_id').eq('user_id', user.id).eq('active', true);
  if (access.error) throw new Error('記録を読み込めませんでした');
  if (!access.data?.length) notFound();
  const record = await db.from('athlete_measurements').select('*').eq('id', id).eq('published', true).in('member_id', access.data.map(a => a.member_id)).maybeSingle();
  if (record.error) throw new Error('記録を読み込めませんでした');
  if (!record.data) notFound();
  const row = record.data;
  const mode=modeForVersion(row.definition_version);
  if (!mode) return <><Link href="/mypage">測定履歴へ</Link><h1>測定結果</h1><p>この測定形式は表示の準備中です。担当トレーナーにお問い合わせください。</p></>;
  const settings = await db.from('athlete_scoring_settings').select('thresholds,rules').eq('company_id', row.company_id).maybeSingle();
  if (settings.error) throw new Error('評価基準を読み込めませんでした');
  const history=await db.from('athlete_measurements').select('*').eq('company_id',row.company_id).eq('member_id',row.member_id).eq('published',true).order('measured_on').order('created_at');
  if(history.error)throw Error('測定履歴を読み込めませんでした');
  const effectiveSettings=recordSettings(row,settings.data);
  const score=scoreRecord(row,settings.data)??row.saved_score;
  const profile=await db.from('athlete_members').select('sport,sport_other,sport_role,throwing_hand,batting_hand').eq('id',row.member_id).eq('company_id',row.company_id).single();
  if(profile.error)throw Error('競技プロフィールを読み込めませんでした');
  return <><Link href="/mypage">測定履歴へ</Link><h1>{row.measured_on} の測定結果</h1><p>{mode.label}{mode.id!=='athlete'&&' ／ アスリート基準による暫定判定'}</p>
    {!effectiveSettings && <p role="status">評価基準が未登録のため、実測値による採点は表示できません。</p>}
    <section className="card"><p>総合スコア</p><div className="score">{effectiveSettings && score.measured ? score.total : '—'}<small> / 100</small></div><p className="muted">{mode.id==='athlete'?'現在の基準で計算しています。':'保存時の基準で表示しています。'}</p></section>
    <ResultVisuals mode={mode.id} profile={profile.data} score={effectiveSettings?score:null} sex={row.threshold_sex} rules={effectiveSettings?.rules} history={historyView(history.data,settings.data,row.definition_version)}/>
    <ExerciseSection db={db} row={row} score={score}/>
    <section className="card"><h2>項目ごとの結果</h2><table><thead><tr><th>項目</th><th>測定結果</th></tr></thead><tbody>{(score.items??[]).map((item, i) => <tr key={i}><td>{item.name}</td><td>{item.val}</td></tr>)}</tbody></table></section>
    {row.public_comment && <section className="card"><h2>トレーナーから</h2><p>{row.public_comment}</p></section>}
  </>;
}
