'use client';
import { useActionState } from 'react';
import { login } from './actions';
export function LoginForm({ enabled }) {
  const [state, action, pending] = useActionState(login, {});
  return <form action={action}>
    <label htmlFor="email">メールアドレス</label><input id="email" name="email" type="email" autoComplete="username" required disabled={!enabled}/>
    <label htmlFor="password">パスワード</label><input id="password" name="password" type="password" autoComplete="current-password" required disabled={!enabled}/>
    {state.error && <p role="alert" className="error">{state.error}</p>}
    <button disabled={pending || !enabled}>{pending ? '確認しています…' : 'ログイン'}</button>
  </form>;
}
