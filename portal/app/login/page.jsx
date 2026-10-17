import { configured } from '../../lib/supabase';
import { LoginForm } from './form';
export const dynamic = 'force-dynamic';
export default function LoginPage() {
  const enabled = configured();
  return <section className="card login"><p className="muted">あなたの測定と、これからの成長</p><h1>アスチェックにログイン</h1>
    <p>会員の方もスタッフの方も、登録済みのアカウントでログインしてください。</p>
    {!enabled && <p role="status">現在ログインを準備中です。担当トレーナーにお問い合わせください。</p>}
    <LoginForm enabled={enabled}/><p className="muted">初めてご利用の方、ログインできない方は担当トレーナーへご連絡ください。</p></section>;
}
