---
title: "Git Hooksでドキュメント同期問題を解決"
date: 2025-08-04
author: myokoym
tags: [documentation, git-hooks, automation, development-workflow]
category: development
lang: ja
description: "git hooksと自動化スクリプトを使って、繰り返し発生していたドキュメントの更新忘れ問題を解決した方法"
---

# Git Hooksでドキュメント同期問題を解決

[English](docs-management-improvement.md) | [日本語](docs-management-improvement.ja.md)

## TL;DR

git hooksと自動チェックを実装して、コード変更時にドキュメントが同期されない問題を解決しました。特に`docs/commands.md`の更新忘れが頻発していた問題に対処しました。

## はじめに

cc-tools-managerプロジェクトでは、ドキュメントを複数の場所で管理しています：
- `README.md` - クイックスタートと概要
- `docs/commands.md` - 包括的なコマンドリファレンス

問題：コマンドを更新する際、`docs/commands.md`の更新を頻繁に忘れ、ユーザーに古い情報を提供してしまっていました。これは注意していても繰り返し発生していました。

## 問題の詳細

### 症状
- コマンドの動作は変更されたがドキュメントは古いまま
- 実際の動作とドキュメントの不一致によるユーザーの混乱
- リマインダーがあっても何度も更新を忘れる

### 根本原因
- 人間の記憶に依存した手動プロセス
- 自動チェックや強制力の欠如
- ドキュメント更新がコード変更後の「二次的な」タスクとして扱われる

## 解決策の実装

### 1. Git Pre-commitフック

コマンドファイルが変更されたときに自動的にチェックし、ドキュメント更新を促すgit hookを作成：

```bash
#!/bin/bash
# .git/hooks/pre-commit

if git diff --cached --name-only | grep -q "src/commands/"; then
  echo "⚠️  警告: コマンドファイルが変更されています！"
  echo ""
  echo "以下を確認してください："
  echo "  □ docs/commands.md を更新しましたか？"
  echo "  □ コマンド比較テーブルも更新しましたか？"
  
  if git diff --cached --name-only | grep -q "docs/commands.md"; then
    echo "✅ docs/commands.md も変更されています。"
  else
    echo "❌ docs/commands.md が変更されていません！"
  fi
  
  echo ""
  echo "続行しますか？ [y/N]"
  read -r response < /dev/tty
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "❌ コミットを中止しました。"
    exit 1
  fi
fi
```

### 2. ドキュメントチェックスクリプト

`scripts/check-docs.sh`を作成してドキュメントの同期を検証：

```bash
#!/bin/bash
# すべてのコマンドにドキュメントがあるかチェック
# READMEとdocs/commands.mdが同期しているかチェック
# コードとドキュメントの最近の更新を表示
```

このスクリプトはいつでも実行してドキュメントの状態を確認できます。

### 3. 役割の明確な分離

各ファイルの役割を明確化：
- **README.md**: クイック例とプロジェクト概要
- **docs/commands.md**: 完全なコマンドリファレンス（信頼できる唯一の情報源）

## 結果

1. **物理的な強制力**: Git hookが確認なしのコミットを防ぐ
2. **簡単な検証**: `./scripts/check-docs.sh`でいつでも確認可能
3. **明確な責任**: 「忘れた」という言い訳が通用しない - システムがリマインドする

## 重要な学び

1. **人間の記憶に頼らない** - 自動化を使用
2. **正しいことを簡単にする** - Git hooksが忘れることを困難にする
3. **信頼できる唯一の情報源** - ドキュメントを一箇所に集約することでメンテナンス負担を軽減

## まとめ

プロセスや記憶に頼るのではなく、技術的な制御を実装することで、長年のドキュメント問題を解決しました。git hookがセーフティネットとして機能し、ドキュメントがコード変更と同期し続けることを保証します。

## 実装の詳細

完全な実装には以下が含まれます：
- `.git/hooks/pre-commit`のGit pre-commitフック
- `scripts/check-docs.sh`のドキュメントチェックスクリプト
- 最新のコマンド動作を反映した`docs/commands.md`の更新

これらの変更により、ドキュメントがコード変更に遅れることは二度とありません。