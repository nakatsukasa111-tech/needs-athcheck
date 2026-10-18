import Brand from './components/brand';
import './style.css';
export const metadata = { title: 'NeeDS フィジカルチェック', robots: { index: false, follow: false } };
export default function Layout({ children }) {
  return <html lang="ja"><body><header><Brand light/></header><main>{children}</main></body></html>;
}
