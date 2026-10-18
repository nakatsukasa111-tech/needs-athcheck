import {configured} from '../../lib/supabase';
import {LoginForm} from './form';
export const dynamic='force-dynamic';
export default function LoginPage(){const enabled=configured();return <section className="auth-minimal login"><h1>NeeDS <span>フィジカルチェック</span></h1><h2>ログイン</h2>{!enabled&&<p role="status">現在ログインを準備中です。</p>}<LoginForm enabled={enabled}/><details className="entry-help"><summary>初めてご利用の方</summary><p>招待メールの案内からパスワードを設定してください。招待が届かない場合は担当トレーナーへご連絡ください。</p></details></section>;}
