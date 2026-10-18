import Link from 'next/link';
export const metadata={title:'デザイン確認｜NeeDS フィジカルチェック'};
export default function PreviewLayout({children}){return <><aside className="preview-nav"><div><strong>画面デザインの確認</strong><span>架空データの見本です。登録・保存は行いません。</span></div><nav aria-label="確認する画面"><Link href="/login">ログイン</Link><Link href="/preview/mypage">会員マイページ</Link><Link href="/preview/staff">スタッフ</Link><Link href="/preview/measure">測定画面</Link></nav></aside>{children}</>;}
