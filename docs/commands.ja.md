# Claude Code Package Manager (ccpm) コマンドリファレンス

[English](commands.md) | [日本語](commands.ja.md)

## コマンド詳細

### list

登録済みリポジトリとその状態、デプロイメント情報を表示します。

#### 基本的な使い方

```bash
ccpm list
```

以下の情報をテーブル形式で表示：
- **インデックス番号 (#)** - リポジトリの素早い選択に使用
- **リポジトリID** - 一意の識別子（詳細表示モードで表示）
- リポジトリ名
- 現在の状態（Active、Error、Not Initialized）
- デプロイメント数
- 登録日

#### 詳細表示モード

```bash
ccpm list --verbose
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

拡張されたデプロイメント追跡機能を持つリポジトリ更新。様々な識別子を使用して特定のリポジトリをターゲットにできます。

#### 使用方法
```bash
# すべてのリポジトリを更新
ccpm update

# リポジトリ名で更新
ccpm update owner/repo

# インデックス番号で更新（listコマンドから）
ccpm update 1

# リポジトリIDで更新
ccpm update abc123def
```

#### 機能
- 名前、インデックス番号（#）、またはIDによるリポジトリ選択
- 高速化のための並列処理
- ファイルレベルの詳細なデプロイメント追跡
- 孤立ファイルの自動クリーンアップ
- 各操作の進捗表示

#### オプション
- `--concurrent <number>`：並列操作数を設定（デフォルト：3）
- `--skip-deploy`：ファイルをデプロイせずにリポジトリを更新
- `--conflict-resolution <strategy>`：競合処理（skip/overwrite/prompt）

### remove

リポジトリと関連するすべてのファイルを削除。他のコマンドと同じ選択方法をサポート。

#### 使用方法
```bash
# リポジトリ名で削除
ccpm remove owner/repo

# インデックス番号で削除
ccpm remove 2

# リポジトリIDで削除
ccpm remove abc123def
```

#### 拡張機能
- 名前、インデックス番号（#）、またはIDによるリポジトリ選択
- デプロイされたすべてのファイルを追跡して削除
- 空のディレクトリをクリーンアップ
- 詳細な削除進捗を表示
- 成功したクリーンアップを確認

例：
```bash
ccpm remove 1

# 出力：
Removing repository owner/repo...
✓ Removed deployed file: ~/.claude/commands/build.md
✓ Removed deployed file: ~/.claude/commands/test.md
✓ Cleaned up empty directory: ~/.claude/commands
✓ Repository removed successfully
```

### show

特定のリポジトリの詳細情報をデプロイメントマッピングとファイルステータスを含めて表示します。

#### 使用方法
```bash
# リポジトリ名で表示
ccpm show owner/repo

# インデックス番号で表示（listコマンドから）
ccpm show 1

# リポジトリIDで表示（部分一致サポート）
ccpm show abc123def
```

#### 機能
- 名前、インデックス番号（#）、またはID（部分IDは最低4文字）でリポジトリを選択
- state.jsonから実際のデプロイパスを表示
- ソース → ターゲットのマッピングをフルパスで表示
- より良い整理のためにファイルをディレクトリごとにグループ化
- ホームディレクトリは自動的に~として表示

#### オプション
- `-v, --verbose`：内部IDやリポジトリステータスを含む追加詳細を表示
- `--format <format>`：出力形式（table、json、yaml、tree）
- `--files-only`：デプロイされたファイルリストのみを表示
- `--tree`：ファイルをツリー形式で表示（--files-onlyと併用）
- `--skip-deployments`：デプロイメント情報セクションをスキップ

#### 出力例
```bash
ccpm show 1

# 出力:
✓ Found repository: owner/agents-repo

Repository: owner/agents-repo

  URL: https://github.com/owner/agents-repo
  Status: active
  Registered: 2025/1/15 10:30:45
  Type: agents
  Deployment Mode: type-based

Deployments:

  Summary:
    Total Files: 3
    Deployed: 3
    Last Deployment: 2025/1/15 10:31:00

  agents/core:
    agents/core/code-archaeologist.md → ~/.claude/agents/core/code-archaeologist.md [deployed]
    agents/core/performance-optimizer.md → ~/.claude/agents/core/performance-optimizer.md [deployed]

  agents/frontend:
    agents/frontend/react-specialist.md → ~/.claude/agents/frontend/react-specialist.md [deployed]
```

### status

デプロイメント詳細を含むリポジトリステータスの確認。特定のリポジトリをクエリしたり、すべてを表示できます。

#### 使用方法
```bash
# すべてのリポジトリのステータスを表示
ccpm status

# リポジトリ名でステータスを表示
ccpm status owner/repo

# インデックス番号でステータスを表示
ccpm status 1

# リポジトリIDでステータスを表示
ccpm status abc123def
```

#### オプション
- `--json`：プログラマティックな使用のためのJSON形式出力

statusコマンドは以下を表示：
- リポジトリIDと名前
- 最終更新タイムスタンプ
- 現在の同期状態
- デプロイされたファイル数
- エラーや警告

## コマンド概要

### 利用可能なコマンド

- `register <url>` - Claudeツールを含むGitHubリポジトリを登録
- `update [repository]` - リポジトリをクローン/更新してツールを~/.claude/にデプロイ
- `list` - 登録されたすべてのリポジトリとその状態を一覧表示
- `show <repository>` - デプロイメントマッピングを含むリポジトリの詳細情報を表示
- `status [repository]` - リポジトリの同期状態とヘルスを表示
- `remove <repository>` - リポジトリとそのデプロイされたファイルをすべて削除

### コマンドフロー

1. **Register**: 追跡するリポジトリURLを追加
2. **Update**: リポジトリをクローンしてツールをデプロイ
3. **List/Status**: リポジトリを監視
4. **Remove**: 不要になったら削除

## 主な機能

### リポジトリ管理
- 複数リポジトリのサポート
- 自動Git操作（clone/pull）
- 名前、ID、またはインデックス番号によるリポジトリ選択

### デプロイメント追跡
- ファイルレベルのデプロイメント追跡
- 孤立ファイルの自動クリーンアップ
- デプロイファイルのツリービュー視覚化
- 空ディレクトリのクリーンアップ

### パフォーマンス
- 高速化のための並列処理
- すべての操作に進捗インジケーター
- 設定可能な並行実行レベル

## 環境変数

コマンドの動作に影響する利用可能な環境変数については、メインの[README](../README.ja.md#環境変数)を参照してください：
- `CCPM_HOME` - ツール保存用のベースディレクトリ
- `CCPM_CLAUDE_DIR` - デプロイ先のClaudeディレクトリ
- `CCPM_LOG_LEVEL` - ログの詳細度