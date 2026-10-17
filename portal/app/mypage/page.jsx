import Link from 'next/link';
import { requireUser } from '../../lib/supabase';
export const dynamic = 'force-dynamic';
export default async function MyPage() {
  const { db, user } = await requireUser();
  const { data: access, error } = await db.from('athlete_member_access').select('member_id').eq('user_id', user.id).eq('active', true);
  if (error) throw new Error('記録を読み込めませんでした');
  const ids = (access ?? []).map(row => row.member_id);
  let records = [];
  if (ids.length) {
    const result = await db.from('athlete_measurements').select('id,measured_on,public_comment').in('member_id', ids).eq('published', true).order('measured_on', { ascending: false });
    if (result.error) throw new Error('記録を読み込めませんでした');
    records = result.data;
  }
  return <><Link href="/">ホームへ</Link><h1>マイページ</h1><p>これまでの測定を振り返りましょう。</p><h2>測定履歴</h2>
    {records.length === 0 && <section className="card"><p>公開された測定結果はまだありません。</p></section>}
    {records.map(row => <section className="card" key={row.id}><h2>{row.measured_on}</h2><p>{row.public_comment}</p><Link href={`/mypage/results/${row.id}`}>測定結果を見る →</Link></section>)}
  </>;
}
