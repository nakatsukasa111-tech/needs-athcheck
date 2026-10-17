# 開発の引き継ぎ

最初に CLAUDE.md、HANDOFF.md、docs/開発仕様_会員マイページ.md、docs/開発ログ.md を読む。
2026-10-16以降のユーザー方針は docs/開発仕様_会員マイページ.md を参照する。
一般用 physical-check と統合しない。認証や設定の設計だけ参考にする。

現在の開発ブランチは codex/athlete-foundation。main は公開サイトへつながっている。
採点部品は tools/extract-scoring.mjs で生成する。直接変更せず、元の採点の変更はユーザーの意図を確認する。
実測データ・接続用の秘密・非公開教材をこの公開リポジトリへ追加しない。

確認：node tools/extract-scoring.mjs --check と node --test tests/*.test.mjs。
既存のUIは新部品へ未接続。テスト成功を、ログインやマイページの完成と報告しない。
