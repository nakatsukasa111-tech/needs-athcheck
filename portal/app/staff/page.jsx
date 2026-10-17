import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '../../lib/supabase';
import { InviteForm } from './invite-form';
export const dynamic = 'force-dynamic';
export default async function StaffPage() {
  const { db, user } = await requireUser();
  const staff = await db.from('athlete_staff').select('company_id,role').eq('user_id', user.id).eq('active', true);
  if (staff.error) throw new Error('スタッフ情報を読み込めませんでした');
  if (!staff.data?.length) notFound();
  const members = await db.from('athlete_members').select('id,company_id,display_name,external_customer_no').in('company_id', staff.data.map(s => s.company_id)).eq('active', true).order('display_name');
  if (members.error) throw new Error('会員を読み込めませんでした');
  return <><Link href="/">ホームへ</Link><h1>会員一覧</h1><section className="card">
    {!members.data.length && <p>登録された会員はまだいません。</p>}
    {members.data.map(m => <section className="card" key={m.id}><h2>{m.display_name}</h2><p className="muted">{m.external_customer_no}</p>
      {staff.data.some(s => s.company_id === m.company_id && s.role === 'admin') && <InviteForm memberId={m.id}/>}
    </section>)}
  </section></>;
}
