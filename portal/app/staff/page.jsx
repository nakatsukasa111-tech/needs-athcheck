import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '../../lib/supabase';
import {adminClient} from '../../lib/admin';
import {readMemberLink} from '../../lib/member-link.mjs';
import MemberDirectory from './member-directory';
export const dynamic = 'force-dynamic';
export default async function StaffPage() {
  const { db, user } = await requireUser();
  const staff = await db.from('athlete_staff').select('company_id,role').eq('user_id', user.id).eq('active', true);
  if (staff.error) throw new Error('スタッフ情報を読み込めませんでした');
  if (!staff.data?.length) notFound();
  const members = await db.from('athlete_members').select('id,company_id,display_name,external_customer_no').in('company_id', staff.data.map(s => s.company_id)).eq('active', true).order('display_name');
  if (members.error) throw new Error('会員を読み込めませんでした');
  const links=Object.fromEntries(await Promise.all(members.data.filter(m=>staff.data.some(s=>s.company_id===m.company_id&&s.role==='admin')).map(async m=>[m.id,await readMemberLink(adminClient(),m)])));
  return <div className="staff-workspace"><div className="workspace-nav"><Link href="/">← ホーム</Link><span>スタッフ専用</span></div><div className="page-heading"><div><p className="eyebrow">会員管理</p><h1>会員一覧</h1><p className="muted">会員を選んで、測定の開始やこれまでの記録を確認できます。</p></div><Link className="button" href="/staff/members/new">＋ 会員を登録</Link></div><MemberDirectory members={members.data} links={links}/></div>;
}
