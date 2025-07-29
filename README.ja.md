# CC Tools Manager

[English](README.md) | [日本語](README.ja.md)

Claude Code関連ツール（コマンド、エージェント、その他の拡張機能）を一元管理するCLIツールです。GitHubリポジトリからツールを自動的に同期し、ローカルの`.claude/`ディレクトリに適切に配置します。

## 特徴

- 🚀 NPX経由で簡単に実行可能
- 📦 GitHubリポジトリからツールを自動同期
- 🔄 並列処理による高速アップデート
- 🎨 見やすいカラー出力とプログレス表示
- 📂 ディレクトリ構造を保持したデプロイメント
- ⚙️ 環境変数による柔軟な設定

## インストール

> **注意**: このパッケージはまだnpmに公開されていません。例に示されているNPXコマンドは、npm公開後に利用可能になります。現在は以下のローカルインストール方法のいずれかを使用してください。

### 将来: NPX経由で実行（npm公開後）

npmに公開されたら、インストール不要で直接実行できるようになります：

```bash
npx cc-tools-manager --help
```

### 現在: クイックインストール（推奨）

インストールスクリプトを実行：

```bash
curl -fsSL https://raw.githubusercontent.com/myokoym/cc-tools-manager/main/install.sh | bash
```

curl経由でインストールした場合、cc-tools-managerは以下にクローンされます：
- デフォルト: `~/.cc-tools/src/cc-tools-manager`
- カスタム: `$CC_TOOLS_HOME/src/cc-tools-manager` (CC_TOOLS_HOMEが設定されている場合)

またはクローンしてローカルで実行：

```bash
git clone https://github.com/myokoym/cc-tools-manager.git
cd cc-tools-manager
./install.sh
```

### 手動インストール

```bash
# リポジトリをクローン
git clone https://github.com/myokoym/cc-tools-manager.git
cd cc-tools-manager

# 依存関係をインストール
npm install

# プロジェクトをビルド
npm run build

# グローバルリンクを作成
npm link
```

インストール後、コマンドをグローバルに使用できます：

```bash
cc-tools-manager --help
```

### 開発セットアップ

ホットリロード付きの開発環境：

```bash
git clone https://github.com/myokoym/cc-tools-manager.git
cd cc-tools-manager
npm install
npm run dev
```

### アンインストール

cc-tools-managerをアンインストールするには：

```bash
# グローバルコマンドを削除
npm unlink -g cc-tools-manager

# インストールディレクトリはインストール時に表示されます
# 必要に応じて手動で削除してください
```

注意：安全上の理由から、アンインストールプロセスではディレクトリを自動的に削除しません。手動削除する前にパスを確認してください。

## 使い方

### リポジトリの登録

GitHubのClaude Codeツールリポジトリを登録します：

```bash
cc-tools-manager register https://github.com/owner/repo

# オプション付き
cc-tools-manager register https://github.com/owner/repo \
  --name "my-tools" \
  --tag "commands"
```

### リポジトリの更新

登録済みのリポジトリを最新版に更新します：

```bash
# すべてのリポジトリを更新
cc-tools-manager update

# 特定のリポジトリを名前で更新
cc-tools-manager update owner/repo

# 特定のリポジトリを番号で更新（list出力の番号）
cc-tools-manager update 2

# 並列処理数を指定（デフォルト: 3）
cc-tools-manager update --concurrent 5

# デプロイメントをスキップ
cc-tools-manager update --skip-deploy
```

### リポジトリ一覧の表示

登録済みのリポジトリを一覧表示します：

```bash
# 基本表示
cc-tools-manager list

# 詳細表示（デプロイファイルツリー付き）
cc-tools-manager list --verbose
```

出力例：
```
Registered Repositories:

#   Name                Status              Deployments    Registered          
────────────────────────────────────────────────────────────────────────────
1   owner/repo1         ● Active                      5    2025/1/15           
2   owner/repo2         ✗ Error                       0    2025/1/10           
3   owner/repo3         ○ Not Initialized             0    2025/1/20           

Total: 3 repositories
```

**注意**: list出力の番号は他のコマンド（update、remove、status）でも使用できます。

📖 **拡張されたlistコマンドやその他の最近の改善については[コマンドリファレンス](docs/commands.ja.md)を参照してください。**

### リポジトリの状態確認

特定のリポジトリの詳細な状態を確認します：

```bash
# 特定のリポジトリ
cc-tools-manager status owner/repo

# すべてのリポジトリ
cc-tools-manager status

# JSON形式で出力
cc-tools-manager status --json
```

### リポジトリの削除

登録済みのリポジトリを削除します：

```bash
# 確認付き削除
cc-tools-manager remove owner/repo

# 番号で削除
cc-tools-manager remove 2

# 確認なしで削除
cc-tools-manager remove owner/repo --force
```

## ディレクトリ構造

CC Tools Managerは以下のディレクトリ構造を使用します：

```
~/.cc-tools/
├── src/                # ソースインストール
│   └── cc-tools-manager/  # CC Tools Manager本体（curl経由でインストールした場合）
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
| `CC_TOOLS_LOG_LEVEL` | ログレベル（DEBUG, INFO, WARN, ERROR） | `ERROR` |
| `CC_TOOLS_LOG_CONSOLE` | コンソールログを有効化（true/false） | `false` |
| `CC_TOOLS_LOG_FILE` | ファイルログを有効化（true/false） | `true` |
| `CC_TOOLS_NO_COLOR` | カラー出力を無効化 | - |
| `CC_TOOLS_DRY_RUN` | 変更を適用せずプレビュー | - |
| `CC_TOOLS_FORCE` | 確認プロンプトをスキップ | - |

使用例：
```bash
# カスタムディレクトリを使用
CC_TOOLS_HOME=/custom/path cc-tools-manager update

# デバッグログを有効化
CC_TOOLS_LOG_LEVEL=DEBUG cc-tools-manager update

# ドライラン
CC_TOOLS_DRY_RUN=1 cc-tools-manager update
```

## 競合解決

ファイルの競合が発生した場合の処理方法を設定できます：

```bash
# デフォルト: プロンプトで確認
cc-tools-manager update

# 既存ファイルをスキップ
cc-tools-manager update --conflict-resolution skip

# 既存ファイルを上書き
cc-tools-manager update --conflict-resolution overwrite
```

## パフォーマンスに関する注意

起動時間が遅い（1秒以上）場合は、以下を試してください：

1. **直接node実行を使用**: グローバルコマンドの代わりに `node /path/to/cc-tools-manager/dist/index.js`
2. **npxを使用**: `npx cc-tools-manager` はグローバルインストール版より高速な場合があります
3. **環境を確認**: 一部の環境（WSL、nvm）はコマンド起動にオーバーヘッドを追加する可能性があります

最高のパフォーマンスのために：
```bash
# シェル設定にエイリアスを作成
alias cctm='node /path/to/cc-tools-manager/dist/index.js'
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
CC_TOOLS_LOG_LEVEL=DEBUG cc-tools-manager update
```

## 開発

### 必要な環境

- Node.js 18以上
- Git 2.x以上
- TypeScript 5.x

### セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/myokoym/cc-tools-manager.git
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

プルリクエストを歓迎します！PRを送信する前に[貢献ガイドライン](CONTRIBUTING.ja.md)をお読みください。

**コントリビューターへの注意**: ドキュメントとコードは英語のみで記述してください。日本語翻訳はプロジェクトチームが別途管理します。

## クレジット

CC Tools Managerは、Claude Codeコミュニティのツール管理を簡単にするために作られました。