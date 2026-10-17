'use server';
import { requireUser } from '../../lib/supabase';
import { adminClient } from '../../lib/admin';
export async function inviteMember(previous, form) {
  const { db, user } = await requireUser();
  const memberId = String(form.get('memberId') ?? '');
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: 'メールアドレスをご確認ください。' };
  const member = await db.from('athlete_members').select('id,company_id').eq('id', memberId).eq('active', true).maybeSingle();
  if (member.error || !member.data) return { error: '会員を確認できませんでした。' };
  const staff = await db.from('athlete_staff').select('role').eq('user_id', user.id).eq('company_id', member.data.company_id).eq('active', true).maybeSingle();
  if (staff.error || staff.data?.role !== 'admin') return { error: '管理者のみ招待できます。' };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SITE_URL) return { error: '招待の設定が完了していません。運営担当者へご連絡ください。' };
  const bound = await db.from('athlete_member_access').select('user_id').eq('member_id', memberId).maybeSingle();
  if (bound.error || bound.data) return { error: 'この会員は紐付け済み、または状態を確認できません。' };
  const pending = await db.from('athlete_invitations').insert({ company_id: member.data.company_id, member_id: memberId, email }).select('id').single();
  if (pending.error) return { error: '招待済み、または招待を登録できませんでした。運営担当者へご確認ください。' };
  try {
    const admin = adminClient();
    const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: new URL('/auth/password', process.env.SITE_URL).href });
    if (error) {
      await db.from('athlete_invitations').delete().eq('id', pending.data.id);
      return { error: '招待を送信できませんでした。既存アカウントの場合は運営担当者に紐付けをご依頼ください。' };
    }
  } catch {
    // 送信結果が不明な場合は再送や取消を自動で行わず、記録を残す。
    return { error: '招待の送信結果を確認できません。運営担当者にご確認ください。' };
  }
  return { success: '招待メールを送信しました。' };
}
