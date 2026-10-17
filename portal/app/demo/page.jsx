import ResultVisuals from '../result-visuals';
import demo from '../../lib/demo-result.json';
export const metadata={title:'画面確認用デモ｜NeeDS フィジカルチェック'};
export default function Demo(){
 const {score,rules}=demo;
 return <><p className="eyebrow">SCREEN PREVIEW</p><h1>選手の結果画面・デモ</h1><p>架空の測定データによる画面確認用です。会員情報の読出し・保存は行いません。</p><nav><a href="/staff">管理・会員一覧</a><a href="/staff/members/new">会員登録</a><a href="/mypage">本人マイページ</a><a href="/login">ログイン</a></nav><section className="card"><h2>デモ選手（架空）</h2><p>2026-10-17 の測定結果</p><div className="score">{score.total}<small> / 100</small></div></section><ResultVisuals initialTheme="quality" score={score} sex="M" rules={rules} history={[]}/></>;
}
