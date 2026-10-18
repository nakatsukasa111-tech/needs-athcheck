'use server';
import {client,configured} from '../../../lib/supabase';
import {requestRecovery} from '../../../lib/password-recovery.mjs';
export async function resetPassword(previous,form){
 if(!configured())return {error:'現在ログインを準備中です。'};
 return requestRecovery(await client(),form.get('email'),process.env.SITE_URL);
}
