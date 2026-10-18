import {SportProfileForm} from '../../forms';
import Link from 'next/link';
import { staffMember } from '../../../../lib/staff';
export const dynamic='force-dynamic';
export default async function Member({params}){
  const {id}=await params; const {db,member}=await staffMember(id);
  const records=await db.from('athlete_measurements').select('id,measured_on,published').eq('member_id',id).eq('company_id',member.company_id).order('measured_on',{ascending:false}).order('created_at',{ascending:false});
  if(records.error)throw new Error('測定履歴を読み込めませんでした');
  const archive=await db.from('athlete_internal_notes').select('note').eq('member_id',id).eq('company_id',member.company_id).maybeSingle();
  let legacy=null;
  if(archive.data?.note){try{const data=JSON.parse(archive.data.note);if(data.source==='legacy-athcheck'&&data.version===1)legacy=data.member;}catch{}}
  return <><Link href="/staff">会員一覧へ</Link><h1>{member.display_name}</h1><p>生年月日：{member.birth_date} ／ 評価基準：{member.threshold_sex==='M'?'男性':'女性'}</p>{legacy&&<p>旧会員番号：{member.external_customer_no} ／ 競技：{legacy.sport||'未登録'} ／ ふりがな：{legacy.kana||'未登録'}</p>}<Link className="button" href={`/staff/members/${id}/measure`}>測定を入力する</Link><Link className="button" href={`/staff/members/${id}/photos`}>写真一覧</Link><SportProfileForm member={member}/><h2>測定履歴</h2>{!records.data.length&&<p>測定記録はまだありません。</p>}{records.data.map(r=><section className="card" key={r.id}><h2>{r.measured_on}</h2><p>{r.published?'本人に公開済み':'下書き（本人には非公開）'}</p><Link href={`/staff/results/${r.id}`}>結果を確認する</Link></section>)}</>;
}
