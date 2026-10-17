'use server';
import { client, configured } from '../../lib/supabase';
import { redirect } from 'next/navigation';
export async function login(previous, form) {
  if (!configured()) return { error: '現在ログインを準備中です。担当トレーナーにお問い合わせください。' };
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'メールアドレスとパスワードを入力してください。' };
  const db = await client();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { error: 'ログインできませんでした。入力内容をご確認ください。' };
  redirect('/');
}
export async function logout() {
  if (configured()) { const db = await client(); await db.auth.signOut(); }
  redirect('/login');
}
