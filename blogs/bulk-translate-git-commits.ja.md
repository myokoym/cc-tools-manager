# git filter-branchを使ったGitコミットメッセージの一括翻訳

## 問題

オープンソースプロジェクトで作業中、いくつかのコミットメッセージが日本語であることに気づきました。国際的なコラボレーションのためには、すべてのコミットメッセージは英語であるべきです。約10個のコミットを翻訳する必要がありました：

```bash
$ git log --oneline -10
55e6ceb fix: ディレクトリを含むタイプベースリポジトリのデプロイエラーを修正
c4f9724 fix: タイプベースリポジトリのデプロイメント問題を修正
622f580 docs: flexible-deployment-patternsのタスク完了状態を更新
...
```

## 解決策：Pythonスクリプトを使用したgit filter-branch

各コミットを手動でリベースして編集する代わりに、`git filter-branch`とPythonスクリプトを使用して翻訳プロセスを自動化しました。

### ステップ1：翻訳スクリプトの作成

まず、日本語メッセージを英語にマップするPythonスクリプトを作成しました：

```python
#!/usr/bin/env python3
import sys

# 日本語メッセージから英語へのマッピング
translations = {
    "docs: セッション履歴に2025-07-31の作業内容を追加": 
        "docs: add session history for 2025-07-31 work",
    "feat: タイプ指定によるリポジトリ登録とデプロイメント機能の実装": 
        "feat: implement repository registration and deployment with type specification",
    "fix: ディレクトリを含むタイプベースリポジトリのデプロイエラーを修正": 
        "fix: fix deployment errors for type-based repositories with directories",
    # ... 他の翻訳
}

# stdinからコミットメッセージを読み取る
message = sys.stdin.read()

# 件名と本文に分割
lines = message.split('\n')
subject = lines[0] if lines else ""
body = '\n'.join(lines[1:]) if len(lines) > 1 else ""

# 件名が日本語の場合は翻訳
if subject in translations:
    subject = translations[subject]

# メッセージを再構築
if body.strip():
    print(subject + '\n' + body)
else:
    print(subject)
```

### ステップ2：フィルタの適用

次に、`git filter-branch`を使用してこのスクリプトをすべてのコミットに適用しました：

```bash
# スクリプトを保存
cat > /tmp/translate_commits.py << 'EOF'
# ... スクリプトの内容 ...
EOF

# 実行可能にする
chmod +x /tmp/translate_commits.py

# origin/main以降のすべてのコミットに適用
git filter-branch -f --msg-filter 'python3 /tmp/translate_commits.py' origin/main..HEAD
```

### ステップ3：結果の確認

コマンド実行後：

```bash
$ git log --oneline -10
65b9862 feat: improve file filtering for type-based deployment
edf6924 fix: fix deployment errors for type-based repositories with directories
a9771d8 fix: fix type-based repository deployment issues
0a8b387 docs: update task completion status for flexible-deployment-patterns
...
```

成功！すべての日本語コミットメッセージが英語に翻訳されました。

## なぜgit filter-branchを使うのか？

### 利点：
1. **バッチ処理**：1つのコマンドですべてのコミットを翻訳
2. **履歴の保持**：コミット日時、作者、構造を維持
3. **スクリプト化可能**：複雑な変換を処理できる
4. **手動操作不要**：`git rebase -i`と異なり、手動編集が不要

### 検討した代替案：

**git rebase -i**：
- 各コミットの手動編集が必要
- インタラクティブなプロセスは簡単に自動化できない
- 多数のコミットでは時間がかかる

**git commit --amend**：
- 最新のコミットでのみ機能
- 各コミットを個別にチェックアウトする必要がある

## 重要な考慮事項

### 1. 履歴の書き換え
これによりコミットハッシュが変更されるため：
- 共有ブランチでは実行しない
- 強制プッシュが必要：`git push --force`
- コラボレーターへの通知が必要

### 2. バックアップの作成
履歴を書き換える前に必ずバックアップブランチを作成：
```bash
git branch backup-before-translation
```

### 3. git filter-repoの代替案
Gitは現在、`filter-branch`より`git filter-repo`を推奨しています：
```bash
# git-filter-repoをインストール
pip install git-filter-repo

# 同様のアプローチで使用
git filter-repo --message-callback '
    # ここに翻訳ロジック
'
```

## 完全なワークフロー

私が使用した完全なワークフローは以下の通りです：

```bash
# 1. 現在の状態を確認
git log --oneline origin/main..HEAD

# 2. バックアップを作成
git branch backup-japanese-commits

# 3. 翻訳スクリプトを作成
cat > /tmp/translate_commits.py << 'EOF'
#!/usr/bin/env python3
import sys

translations = {
    # ここに翻訳を追加
}

message = sys.stdin.read()
lines = message.split('\n')
subject = lines[0] if lines else ""
body = '\n'.join(lines[1:]) if len(lines) > 1 else ""

if subject in translations:
    subject = translations[subject]

if body.strip():
    print(subject + '\n' + body)
else:
    print(subject)
EOF

# 4. 実行可能にする
chmod +x /tmp/translate_commits.py

# 5. フィルタを適用
git filter-branch -f --msg-filter 'python3 /tmp/translate_commits.py' origin/main..HEAD

# 6. 結果を確認
git log --oneline origin/main..HEAD

# 7. クリーンアップ
rm /tmp/translate_commits.py
```

## 学んだこと

1. **英語でコミット**：オープンソースプロジェクトでは常に英語を使用
2. **繰り返し作業の自動化**：スクリプトは時間を節約し、エラーを減らす
3. **Gitは強力**：filter-branchのようなツールで複雑な履歴の修正が可能
4. **まずテスト**：mainに適用する前に必ずバックアップブランチでテスト

## ボーナス：将来の問題を防ぐ

英語を強制するcommit-msgフックを追加：

```bash
#!/bin/bash
# .git/hooks/commit-msg

# 一般的な日本語文字の簡単なチェック
if grep -qE '[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]' "$1"; then
    echo "Error: Commit message contains Japanese characters."
    echo "Please use English for commit messages."
    exit 1
fi
```

## まとめ

カスタムスクリプトと`git filter-branch`を使用して、すべての日本語コミットメッセージを1回の操作で英語に翻訳することに成功しました。このアプローチは手動編集よりもはるかに効率的で、さまざまなコミットメッセージの変換に適応できます。

覚えておいてください：大きな力には大きな責任が伴います。Git履歴を書き換える前に必ず作業をバックアップしてください！