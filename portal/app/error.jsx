'use client';
export default function ErrorPage({ reset }) {
  return <section className="card"><h1>読み込めませんでした</h1><p>時間をおいて、もう一度お試しください。</p><button onClick={reset}>再読み込み</button></section>;
}
