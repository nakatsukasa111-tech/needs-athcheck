import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const db = createServerClient(url, key, { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        for (const { name, value } of items) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of items) response.cookies.set(name, value, options);
      },
    } });
    await db.auth.getUser();
  }
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
