import { NextResponse } from 'next/server';
import { client } from '../../../lib/supabase';
export async function GET(request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (token_hash && type === 'invite') {
    const db = await client();
    const { error } = await db.auth.verifyOtp({ token_hash, type: 'invite' });
    if (!error) return NextResponse.redirect(new URL('/auth/password', url.origin));
  }
  return NextResponse.redirect(new URL('/login?invite=invalid', url.origin));
}
