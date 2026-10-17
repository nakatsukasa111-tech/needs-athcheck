'use server';
import { requireUser } from '../../../lib/supabase';
import { redirect } from 'next/navigation';
export async function setPassword(previous, form) {
  const { db } = await requireUser();
  const password = String(form.get('password') ?? '');
  if (password.length < 12 || password.length > 128) return { error: 'パスワードは12〜128文字で入力してください。' };
  if (password !== form.get('confirm')) return { error: '確認用のパスワードが一致しません。' };
  const result = await db.auth.updateUser({ password });
  if (result.error) return { error: 'パスワードを設定できませんでした。もう一度お試しください。' };
  const accepted = await db.rpc('accept_athlete_invitation');
  if (accepted.error) return { error: 'アカウントの紐付けを完了できませんでした。担当トレーナーへご連絡ください。' };
  redirect('/');
}
