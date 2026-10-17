import 'server-only';
import { requireUser } from './supabase';
export async function requireStaff(companyId) {
  const { db, user } = await requireUser();
  const result = await db.from('athlete_staff').select('company_id,role').eq('user_id', user.id).eq('active', true);
  if (result.error || !result.data?.length || (companyId && !result.data.some(s => s.company_id === companyId))) throw new Error('スタッフ権限を確認できません。');
  return { db, user, staff: result.data };
}
export async function staffMember(id) {
  const { db, staff } = await requireStaff();
  const m = await db.from('athlete_members').select('*').eq('id', id).eq('active', true).in('company_id', staff.map(s => s.company_id)).maybeSingle();
  if (m.error || !m.data) throw new Error('会員を確認できません。');
  return { db, member: m.data };
}
