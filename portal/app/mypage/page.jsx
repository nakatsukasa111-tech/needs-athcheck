import MemberHome from '../components/member-home';
import { requireUser } from '../../lib/supabase';
export const dynamic = 'force-dynamic';
export default async function MyPage() {
  const { db, user } = await requireUser();
  const { data: access, error } = await db.from('athlete_member_access').select('member_id').eq('user_id', user.id).eq('active', true);
  if (error) throw new Error('記録を読み込めませんでした');
  const ids = (access ?? []).map(row => row.member_id);
  const memberNames=ids.length?await db.from('athlete_members').select('display_name').in('id',ids):{data:[]};
  if(memberNames.error)throw new Error('会員情報を読み込めませんでした');
  let records = [];
  if (ids.length) {
    const result = await db.from('athlete_measurements').select('id,measured_on,public_comment,definition_version').in('member_id', ids).eq('published', true).order('measured_on', { ascending: false });
    if (result.error) throw new Error('記録を読み込めませんでした');
    records = result.data;
  }
  return <MemberHome names={memberNames.data.map(m=>m.display_name)} records={records??[]} linked={ids.length>0}/>;
}
