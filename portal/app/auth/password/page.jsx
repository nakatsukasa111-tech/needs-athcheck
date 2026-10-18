import {client} from '../../../lib/supabase';
import {redirect} from 'next/navigation';
import {PasswordForm} from './form';
export const dynamic='force-dynamic';
export default async function PasswordPage({searchParams}){
 const params=await searchParams;
 if(params.code)redirect('/auth/confirm?code='+encodeURIComponent(params.code));
 if(params.error||params.error_code)redirect('/login/reset?error=invalid');
 const db=await client();const {data,error}=await db.auth.getUser();
 if(error||!data.user)redirect('/login/reset?error=invalid');
 return <section className="card login auth-minimal"><h1>パスワードを設定</h1><p>新しいパスワードを2回入力してください。</p><PasswordForm/></section>;
}
