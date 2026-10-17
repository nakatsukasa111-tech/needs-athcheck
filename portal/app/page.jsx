import Link from 'next/link';
import { requireUser } from '../lib/supabase';
import { logout } from './login/actions';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const { db, user } = await requireUser();
  const [{ data: staff, error: staffError }, { data: access, error: accessError }] = await Promise.all([
    db.from('athlete_staff').select('company_id,display_name,role').eq('user_id', user.id).eq('active', true),
    db.from('athlete_member_access').select('member_id').eq('user_id', user.id).eq('active', true),
  ]);
  if (staffError || accessError) throw new Error('アカウントの読み込みに失敗しました');
  return <><h1>アスチェック</h1><p>利用するページを選んでください。</p><nav>
    {staff?.length > 0 && <Link className="button" href="/staff">スタッフ画面</Link>}
    {access?.length > 0 && <Link className="button" href="/mypage">マイページ</Link>}
  </nav>{!staff?.length && !access?.length && <section className="card"><p>このアカウントには、まだ閲覧できる記録がありません。担当トレーナーにお問い合わせください。</p></section>}
    <form action={logout}><button>ログアウト</button></form></>;
}
