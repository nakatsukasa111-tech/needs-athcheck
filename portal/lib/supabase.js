import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

export function configured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
export async function client() {
  if (!configured()) throw new Error('認証サービスの接続設定が必要です');
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(items) {
        try { for (const { name, value, options } of items) jar.set(name, value, options); }
        catch { /* Server Componentでの更新はproxyが担当する */ }
      },
    },
  });
}
export async function requireUser() {
  if (!configured()) redirect('/login');
  const db = await client();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) redirect('/login');
  return { db, user: data.user };
}
