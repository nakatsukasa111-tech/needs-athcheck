import './style.css';
export const metadata = { title: 'NeeDS アスチェック', robots: { index: false, follow: false } };
export default function Layout({ children }) {
  return <html lang="ja"><body><header><strong>NeeDS</strong><span>アスチェック</span></header><main>{children}</main></body></html>;
}
