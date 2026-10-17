import './style.css';
export const metadata = { title: 'ニーズフィジカルチェック', robots: { index: false, follow: false } };
export default function Layout({ children }) {
  return <html lang="ja"><body><header><strong>ニーズフィジカルチェック</strong></header><main>{children}</main></body></html>;
}
