import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '../../lib/supabase';
import {adminClient} from '../../lib/admin';
import {readMemberLink} from '../../lib/member-link.mjs';
import { InviteForm } from './invite-form';
export const dynamic = 'force-dynamic';
export default async function StaffPage() {
  const { db, user } = await requireUser();
  const staff = await db.from('athlete_staff').select('company_id,role').eq('user_id', user.id).eq('active', true);
  if (staff.error) throw new Error('スタッフ情報を読み込めませんでした');
  if (!staff.data?.length) notFound();
  const members = await db.from('athlete_members').select('id,company_id,display_name,external_customer_no').in('company_id', staff.data.map(s => s.company_id)).eq('active', true).order('display_name');
  if (members.error) throw new Error('会員を読み込めませんでした');
  const links=Object.fromEntries(await Promise.all(members.data.filter(m=>staff.data.some(s=>s.company_id===m.company_id&&s.role==='admin')).map(async m=>[m.id,await readMemberLink(adminClient(),m)])));
  return <><Link href="/">ホームへ</Link><div className="page-heading"><div><p className="eyebrow">STAFF WORKSPACE</p><h1>会員一覧</h1></div><Link className="button" href="/staff/members/new">会員を登録する</Link></div><section className="member-list">
    {!members.data.length && <p>登録された会員はまだいません。</p>}
    {members.data.map(m => <section className="card" key={m.id}><h2>{m.display_name}</h2><p className="muted">{m.external_customer_no}</p><Link href={`/staff/members/${m.id}`}>測定入力・履歴を見る →</Link>
      {staff.data.some(s => s.company_id === m.company_id && s.role === 'admin') && <InviteForm key={JSON.stringify(links[m.id])} memberId={m.id} link={links[m.id]}/>}
    </section>)}
  </section></>;
}
