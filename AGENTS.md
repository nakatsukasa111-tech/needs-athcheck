# 開発の引き継ぎ

最初に CLAUDE.md、HANDOFF.md、docs/開発仕様_会員マイページ.md、docs/開発ログ.md を読む。
2026-10-16以降のユーザー方針は docs/開発仕様_会員マイページ.md を参照する。
2026-10-24のユーザー方針：このアプリにアスリート・一般ベーシック・一般アクティブの3モードを追加する。旧一般用 physical-check のDB・会員データを自動統合する指示ではない。詳細は docs/開発仕様_一般用モード.md を参照する。

現在の開発ブランチは codex/athlete-foundation。main は公開サイトへつながっている。
採点部品は tools/extract-scoring.mjs で生成する。直接変更せず、元の採点の変更はユーザーの意図を確認する。
実測データ・接続用の秘密・非公開教材をこの公開リポジトリへ追加しない。

確認：node tools/extract-scoring.mjs --check と node --test tests/*.test.mjs。
既存index.htmlは新部品へ未接続。portal/では採点・ボディマップ・グラフ・教材提案を接続済み。
人体図の生成部品は tools/extract-bodymap.mjs で同期する。テスト成功だけで実環境の完成を報告しない。
