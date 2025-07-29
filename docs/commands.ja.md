# CC Tools Manager コマンドリファレンス

[English](commands.md) | [日本語](commands.ja.md)

## コマンド詳細

### list

登録済みリポジトリとその状態、デプロイメント情報を表示します。

#### 基本的な使い方

```bash
npx cc-tools-manager list
```

以下の情報をテーブル形式で表示：
- リポジトリ名
- 現在の状態（Active、Error、Not Initialized）
- デプロイメント数
- 登録日

#### 詳細表示モード

```bash
npx cc-tools-manager list --verbose
```

詳細表示モードでは、追加で以下を表示：
- リポジトリの詳細情報
- デプロイファイルのツリー表示（全デプロイファイルとディレクトリ構造）
- ファイル数の統計

詳細表示の出力例：
```
Registered Repositories:

Name                Status              Deployments    Registered          
────────────────────────────────────────────────────────────────────────
owner/repo1         ● Active                      5    2025/1/15           

  Deployed Files:
  └── commands/
      ├── utils/
      │   └── helper.md
      ├── build.md
      └── test.md
  
  Total: 3 files

owner/repo2         ✗ Error                       0    2025/1/10           
  Last error: Authentication failed

Total: 2 repositories
```

### update

拡張されたデプロイメント追跡機能を持つリポジトリ更新。

#### 機能
- 高速化のための並列処理
- ファイルレベルの詳細なデプロイメント追跡
- 孤立ファイルの自動クリーンアップ
- 各操作の進捗表示

#### オプション
- `--concurrent <number>`：並列操作数を設定（デフォルト：3）
- `--skip-deploy`：ファイルをデプロイせずにリポジトリを更新
- `--conflict-resolution <strategy>`：競合処理（skip/overwrite/prompt）

### remove

リポジトリと関連するすべてのファイルを削除。

#### 拡張機能
- デプロイされたすべてのファイルを追跡して削除
- 空のディレクトリをクリーンアップ
- 詳細な削除進捗を表示
- 成功したクリーンアップを確認

例：
```bash
npx cc-tools-manager remove owner/repo

# 出力：
Removing repository owner/repo...
✓ Removed deployed file: ~/.claude/commands/build.md
✓ Removed deployed file: ~/.claude/commands/test.md
✓ Cleaned up empty directory: ~/.claude/commands
✓ Repository removed successfully
```

### status

デプロイメント詳細を含むリポジトリステータスの確認。

#### オプション
- `--json`：プログラマティックな使用のためのJSON形式出力

statusコマンドは以下を表示：
- 最終更新タイムスタンプ
- 現在の同期状態
- デプロイされたファイル数
- エラーや警告

## 最近の機能強化

### バージョン1.0.0の更新

1. **デプロイメントのツリービュー**：`list --verbose`コマンドでデプロイファイルをツリー構造で表示し、ファイル組織を視覚化しやすくなりました。

2. **拡張デプロイメント追跡**：すべてのコマンドがファイルレベルでデプロイメントを追跡し、より良い可視性と制御を提供。

3. **WSL互換性**：WSL環境でのreadlineハング問題を修正し、クロスプラットフォームサポートを改善。

4. **改善されたエラーハンドリング**：より詳細なエラーメッセージと復旧提案。

## 環境変数

コマンドの動作に影響する利用可能な環境変数については、メインの[README](../README.ja.md#環境変数)を参照してください。