import Link from 'next/link';
import { requireStaff } from '../../../../lib/staff';
import { todayJapan } from '../../../../lib/measurement-input.mjs';
import { MemberForm } from '../../forms';
export const dynamic='force-dynamic';
export default async function NewMember(){
  const {db,staff}=await requireStaff();
  const companies=await db.from('athlete_companies').select('id,name').in('id',staff.map(s=>s.company_id)).eq('active',true);
  if(companies.error)throw new Error('所属会社を読み込めませんでした');
  return <><Link href="/staff">会員一覧へ</Link><h1>会員登録</h1><p>測定記録の登録後、管理者がメールで本人のアカウントを招待できます。</p><MemberForm companies={companies.data} today={todayJapan()}/></>;
}
