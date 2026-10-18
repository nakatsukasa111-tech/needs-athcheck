'use client';
import {useActionState} from 'react';
import {resetPassword} from './actions';
export default function ResetForm(){const [state,action,pending]=useActionState(resetPassword,{});return <form action={action}><label htmlFor="reset-email">登録したメールアドレス</label><input id="reset-email" name="email" type="email" autoComplete="email" maxLength={254} required/>{state.error&&<p className="error" role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}<button disabled={pending||!!state.success}>{pending?'送信しています…':state.success?'送信受付済み':'再設定メールを送信'}</button>{state.success&&<p className="muted">最後に届いたメールのリンクを開いてください。リンクは一度だけ利用できます。届かない場合は迷惑メールフォルダーもご確認ください。</p>}</form>;}
