'use client';
import {useActionState,useState} from 'react';
import Link from 'next/link';
import {login} from './actions';
export function LoginForm({enabled}){
 const [state,action,pending]=useActionState(login,{});
 const [audience,setAudience]=useState('member'),[visible,setVisible]=useState(false);
 return <><div className="entry-audience" role="group" aria-label="利用する画面"><button type="button" aria-pressed={audience==='member'} onClick={()=>setAudience('member')}>会員の方</button><button type="button" aria-pressed={audience==='staff'} onClick={()=>setAudience('staff')}>スタッフの方</button></div><p className="entry-context">{audience==='member'?'測定結果・推奨エクササイズを確認できます。':'会員の登録・測定入力・結果の公開を行います。'}</p><form action={action} className="entry-form"><label htmlFor="email">メールアドレス</label><input id="email" name="email" type="email" autoComplete="username" placeholder="name@example.com" required disabled={!enabled}/><div className="password-label"><label htmlFor="password">パスワード</label><button type="button" aria-controls="password" aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?'非表示にする':'表示する'}</button></div><input id="password" name="password" type={visible?'text':'password'} autoComplete="current-password" required disabled={!enabled}/>{state.error&&<p role="alert" className="error">{state.error}</p>}<button className="entry-submit" disabled={pending||!enabled}>{pending?'確認しています…':'ログインする'}<span aria-hidden="true"> →</span></button><p className="reset-link"><Link href="/login/reset">パスワードを忘れた方</Link></p></form></>;
}
