# CC Tools Manager

Claude Code関連ツール（コマンド、エージェント、その他の拡張機能）を一元管理するCLIツールです。GitHubリポジトリからツールを自動的に同期し、ローカルの`.claude/`ディレクトリに適切に配置します。

## 特徴

- 🚀 NPX経由で簡単に実行可能
- 📦 GitHubリポジトリからツールを自動同期
- 🔄 並列処理による高速アップデート
- 🎨 見やすいカラー出力とプログレス表示
- 📂 ディレクトリ構造を保持したデプロイメント
- ⚙️ 環境変数による柔軟な設定

## インストール

### NPX経由で実行（推奨）

インストール不要で直接実行できます：

```bash
npx cc-tools-manager --help
```

### グローバルインストール

```bash
npm install -g cc-tools-manager
```

### ローカル開発

```bash
git clone https://github.com/yourusername/cc-tools-manager.git
cd cc-tools-manager
npm install
npm run build
npm link
```

## 使い方

### リポジトリの登録

GitHubのClaude Codeツールリポジトリを登録します：

```bash
npx cc-tools-manager register https://github.com/owner/repo

# オプション付き
npx cc-tools-manager register https://github.com/owner/repo \
  --name "my-tools" \
  --tag "commands"
```

### リポジトリの更新

登録済みのリポジトリを最新版に更新します：

```bash
# すべてのリポジトリを更新
npx cc-tools-manager update

# 特定のリポジトリのみ更新
npx cc-tools-manager update owner/repo

# 並列処理数を指定（デフォルト: 3）
npx cc-tools-manager update --concurrent 5

# デプロイメントをスキップ
npx cc-tools-manager update --skip-deploy
```

### リポジトリ一覧の表示

登録済みのリポジトリを一覧表示します：

```bash
# 基本表示
npx cc-tools-manager list

# 詳細表示
npx cc-tools-manager list --verbose
```

出力例：
```
Registered Repositories:

Name                Status              Deployments    Registered          
────────────────────────────────────────────────────────────────────────
owner/repo1         ● Active                      5    2025/1/15           
owner/repo2         ✗ Error                       0    2025/1/10           
owner/repo3         ○ Not Initialized             0    2025/1/20           

Total: 3 repositories
```

### リポジトリの状態確認

特定のリポジトリの詳細な状態を確認します：

```bash
# 特定のリポジトリ
npx cc-tools-manager status owner/repo

# すべてのリポジトリ
npx cc-tools-manager status

# JSON形式で出力
npx cc-tools-manager status --json
```

### リポジトリの削除

登録済みのリポジトリを削除します：

```bash
# 確認付き削除
npx cc-tools-manager remove owner/repo

# 確認なしで削除
npx cc-tools-manager remove owner/repo --force
```

## ディレクトリ構造

CC Tools Managerは以下のディレクトリ構造を使用します：

```
~/.cc-tools/
├── repos/              # クローンされたリポジトリ
│   ├── owner-repo1/
│   └── owner-repo2/
├── cache/              # キャッシュとメタデータ
│   └── state.json      # 同期状態
├── config/             # 設定ファイル
│   └── settings.json   # カスタム設定
└── logs/               # ログファイル
    └── cc-tools.log

~/.claude/              # デプロイ先
├── commands/           # スラッシュコマンド
├── agents/             # AIエージェント
└── hooks/              # フック設定
```

## デプロイメントパターン

リポジトリ内のファイルは以下のパターンに従ってデプロイされます：

### 1. .claude プレフィックスパターン
```
リポジトリ/.claude/commands/foo.md → ~/.claude/commands/foo.md
リポジトリ/.claude/agents/bar.md → ~/.claude/agents/bar.md
```

### 2. 直接パターン（.claudeなし）
```
リポジトリ/commands/foo.md → ~/.claude/commands/foo.md
リポジトリ/agents/bar.md → ~/.claude/agents/bar.md
```

ディレクトリ構造は保持されます：
```
リポジトリ/commands/utils/helper.md → ~/.claude/commands/utils/helper.md
```

## 環境変数

動作をカスタマイズする環境変数：

| 環境変数 | 説明 | デフォルト値 |
|---------|------|------------|
| `CC_TOOLS_HOME` | ツール保存用のベースディレクトリ | `~/.cc-tools` |
| `CC_TOOLS_CLAUDE_DIR` | デプロイ先のclaudeディレクトリ | `~/.claude` |
| `CC_TOOLS_LOG_LEVEL` | ログレベル（DEBUG, INFO, WARN, ERROR） | `INFO` |
| `CC_TOOLS_NO_COLOR` | カラー出力を無効化 | - |
| `CC_TOOLS_DRY_RUN` | 変更を適用せずプレビュー | - |
| `CC_TOOLS_FORCE` | 確認プロンプトをスキップ | - |

使用例：
```bash
# カスタムディレクトリを使用
CC_TOOLS_HOME=/custom/path npx cc-tools-manager update

# デバッグログを有効化
CC_TOOLS_LOG_LEVEL=DEBUG npx cc-tools-manager update

# ドライラン
CC_TOOLS_DRY_RUN=1 npx cc-tools-manager update
```

## 競合解決

ファイルの競合が発生した場合の処理方法を設定できます：

```bash
# デフォルト: プロンプトで確認
npx cc-tools-manager update

# 既存ファイルをスキップ
npx cc-tools-manager update --conflict-resolution skip

# 既存ファイルを上書き
npx cc-tools-manager update --conflict-resolution overwrite
```

## トラブルシューティング

### Git認証エラー

プライベートリポジトリの場合、SSHキーまたはアクセストークンの設定が必要です：

```bash
# SSHキーを使用
git config --global url."git@github.com:".insteadOf "https://github.com/"

# アクセストークンを使用
git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
```

### 権限エラー

ファイルの書き込み権限を確認してください：

```bash
# 権限を修正
chmod -R u+w ~/.claude
chmod -R u+w ~/.cc-tools
```

### ログの確認

詳細なログは以下で確認できます：

```bash
# ログファイルを表示
tail -f ~/.cc-tools/logs/cc-tools.log

# デバッグモードで実行
CC_TOOLS_LOG_LEVEL=DEBUG npx cc-tools-manager update
```

## 開発

### 必要な環境

- Node.js 18以上
- Git 2.x以上
- TypeScript 5.x

### セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/cc-tools-manager.git
cd cc-tools-manager

# 依存関係のインストール
npm install

# 開発モードで実行
npm run dev

# テストの実行
npm test

# ビルド
npm run build
```

### プロジェクト構造

```
cc-tools-manager/
├── src/
│   ├── commands/       # CLIコマンド
│   ├── core/           # コアサービス
│   ├── utils/          # ユーティリティ
│   └── types/          # TypeScript型定義
├── tests/              # テストスイート
└── dist/               # ビルド成果物
```

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します！バグ報告や機能要望は[Issues](https://github.com/yourusername/cc-tools-manager/issues)までお願いします。

## クレジット

CC Tools Managerは、Claude Codeコミュニティのツール管理を簡単にするために作られました。