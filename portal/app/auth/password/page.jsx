import {redirect} from 'next/navigation';
import {Recovery} from './recovery';
export const dynamic='force-dynamic';
export const metadata={referrer:'no-referrer'};
export default async function PasswordPage({searchParams}){
 const params=await searchParams;
 if(params.code)redirect('/auth/confirm?code='+encodeURIComponent(params.code));
 if(params.error||params.error_code)redirect('/login/reset?error=invalid');
 // URL fragments are only visible in the browser. Never redirect before reading them.
 return <section className="card login auth-minimal"><h1>パスワードを設定</h1><Recovery/></section>;
}
