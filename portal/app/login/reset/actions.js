'use server';
import {createClient} from '@supabase/supabase-js';
import {configured} from '../../../lib/supabase';
import {requestRecovery} from '../../../lib/password-recovery.mjs';
export async function resetPassword(previous,form){
 if(!configured())return {error:'現在ログインを準備中です。'};
 // Recovery must also work when an email opens in a different browser.
 // This isolated client sends mail only and never persists an admin session.
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{flowType:'implicit',persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 return requestRecovery(db,form.get('email'),process.env.SITE_URL);
}
