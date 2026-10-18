'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {createBrowserClient} from '@supabase/ssr';
import {acceptRecoveryFragment} from '../../../lib/recovery-callback.mjs';
import {PasswordForm} from './form';
export function Recovery(){
 const started=useRef(false),[status,setStatus]=useState('loading');
 useEffect(()=>{if(started.current)return;started.current=true;
  const db=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{detectSessionInUrl:false}});
  acceptRecoveryFragment(db.auth,window.location.hash,()=>window.history.replaceState(null,'','/auth/password'))
   .then(ok=>setStatus(ok?'ready':'invalid')).catch(()=>setStatus('invalid'));
 },[]);
 if(status==='loading')return <p role="status">メールのリンクを確認しています…</p>;
 if(status==='invalid')return <><p role="alert" className="error">このリンクでは認証できませんでした。リンクは一度だけ利用できます。新しく再設定メールを送り、最後に届いたメールのリンクを開いてください。</p><Link href="/login/reset">再設定メールを送り直す</Link></>;
 return <><p>新しいパスワードを2回入力してください。</p><PasswordForm/></>;
}
