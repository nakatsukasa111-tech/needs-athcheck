import Link from 'next/link';
import ResetForm from './form';
export default async function ResetPage({searchParams}){const params=await searchParams;return <section className="card login auth-minimal"><h1>パスワードの再設定</h1><p>登録したメールアドレスに、再設定用のリンクを送ります。</p>{params.error&&<p role="alert" className="error">リンクが無効、期限切れ、または別のブラウザで開かれています。このブラウザから再設定メールを送り直してください。</p>}<ResetForm/><p><Link href="/login">ログインに戻る</Link></p></section>;}
