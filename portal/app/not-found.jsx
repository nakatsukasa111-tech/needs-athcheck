import Link from 'next/link';
export default function NotFound() { return <section className="card"><h1>ページが見つかりません</h1><p>閲覧できる記録がないか、ページが変更されています。</p><Link href="/">ホームへ戻る</Link></section>; }
