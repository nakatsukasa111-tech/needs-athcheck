'use client';
import { useActionState } from 'react';
import { setPassword } from './actions';
export function PasswordForm() {
  const [state, action, pending] = useActionState(setPassword, {});
  return <form action={action}><label htmlFor="new-password">パスワード（12文字以上）</label><input id="new-password" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required/>
    <label htmlFor="confirm-password">確認用パスワード</label><input id="confirm-password" name="confirm" type="password" minLength={12} maxLength={128} autoComplete="new-password" required/>
    {state.error && <p role="alert" className="error">{state.error}</p>}<button disabled={pending}>{pending ? '設定しています…' : '設定して始める'}</button></form>;
}
