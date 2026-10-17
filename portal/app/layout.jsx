import './style.css';
export const metadata = { title: 'NeeDS フィジカルチェック', robots: { index: false, follow: false } };
export default function Layout({ children }) {
  return <html lang="ja"><body><header><strong>NeeDS フィジカルチェック</strong></header><main>{children}</main></body></html>;
}
