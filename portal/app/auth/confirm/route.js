import {NextResponse} from 'next/server';
import {client} from '../../../lib/supabase';
export async function GET(request){
 const url=new URL(request.url),token_hash=url.searchParams.get('token_hash'),type=url.searchParams.get('type'),code=url.searchParams.get('code');
 const db=await client();
 if(code){const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL('/auth/password',url.origin));}
 else if(token_hash&&['invite','recovery'].includes(type)){const {error}=await db.auth.verifyOtp({token_hash,type});if(!error)return NextResponse.redirect(new URL('/auth/password',url.origin));}
 return NextResponse.redirect(new URL('/login/reset?error=invalid',url.origin));
}
