# CC Tools Manager - 技術スタック

## アーキテクチャ

CC Tools Managerは、Node.jsベースのCLIツールとして設計され、NPX経由で簡単にインストール・実行できるようになっています。

### ハイレベル設計
```
┌─────────────────────┐     ┌────────────────────┐
│   CLIインターフェース │────▶│ リポジトリレジストリ │
│   (Commander.js)    │     │ (repositories.json)│
└─────────────────────┘     └────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────┐     ┌────────────────────┐
│    Git操作層        │────▶│  GitHubリポジトリ   │
│  (simple-git)       │     │  (リモートソース)   │
└─────────────────────┘     └────────────────────┘
           │
           ▼
┌─────────────────────┐     ┌────────────────────┐
│  ファイルシステム層  │────▶│  ローカル.claude/  │
│  (fs-extra)         │     │  ディレクトリ      │
└─────────────────────┘     └────────────────────┘
```

## コア技術

### 言語とランタイム
- **プライマリ言語**: TypeScript/JavaScript
- **ランタイム**: Node.js (16.x以上)
- **パッケージマネージャー**: npm/yarn
- **配布方法**: NPX経由での実行をサポート

### 主要な依存関係
```json
{
  "dependencies": {
    "commander": "^11.0.0",      // CLIフレームワーク
    "simple-git": "^3.19.0",     // Git操作
    "fs-extra": "^11.1.0",       // ファイルシステム操作
    "chalk": "^5.3.0",           // ターミナルカラー
    "ora": "^7.0.0",            // プログレスインジケーター
    "inquirer": "^9.2.0",        // インタラクティブプロンプト
    "winston": "^3.10.0"         // ロギング
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0"
  }
}
```

## 開発環境

### 必要なツール
- Node.js (16.x以上)
- Git (2.x以上)
- npm または yarn

### 開発セットアップ
```bash
# リポジトリのクローン
git clone <repository-url>
cd cc-tools-manager

# 依存関係のインストール
npm install

# TypeScriptのビルド
npm run build

# 開発モードで実行
npm run dev

# グローバルインストール（オプション）
npm link
```

### NPX経由での実行
```bash
# インストールせずに直接実行
npx cc-tools-manager update

# 特定のバージョンを実行
npx cc-tools-manager@latest register <github-url>
```

## 一般的なコマンド

### コア操作
```bash
# 新しいリポジトリを登録
npx cc-tools-manager register <github-url>

# すべての登録済みリポジトリを更新
npx cc-tools-manager update

# 特定のリポジトリを更新
npx cc-tools-manager update <repo-name>

# 登録済みリポジトリを一覧表示
npx cc-tools-manager list

# すべてのリポジトリのステータスを表示
npx cc-tools-manager status
```

### 管理コマンド
```bash
# リポジトリを削除
npx cc-tools-manager remove <repo-name>

# 更新をチェック（適用せず）
npx cc-tools-manager check

# 孤立したファイルをクリーンアップ
npx cc-tools-manager clean

# インタラクティブモード
npx cc-tools-manager interactive
```

## 環境変数

### 設定
- `CC_TOOLS_HOME`: ツール保存用のベースディレクトリ（デフォルト: `~/.cc-tools`）
- `CC_TOOLS_CLAUDE_DIR`: ターゲットのclaudeディレクトリ（デフォルト: `~/.claude`）
- `CC_TOOLS_LOG_LEVEL`: ログの詳細度（デフォルト: `INFO`）
- `CC_TOOLS_CONFIG`: カスタム設定ファイルのパス

### ランタイムオプション
- `CC_TOOLS_NO_COLOR`: カラー出力を無効化
- `CC_TOOLS_DRY_RUN`: 変更を適用せずプレビュー
- `CC_TOOLS_FORCE`: 確認なしで操作を強制実行
- `CC_TOOLS_PARALLEL`: 並列処理の有効化

## ディレクトリ構造

### ツール保存
```
$CC_TOOLS_HOME/
├── repos/              # クローンされたリポジトリ（フラットに保存）
│   ├── repo-name-1/
│   ├── repo-name-2/
│   └── repo-name-3/
├── cache/              # 一時ファイルとメタデータ
├── config/             # 設定ファイル
└── logs/               # 操作ログ
```

### デプロイメントターゲット
```
$CC_TOOLS_CLAUDE_DIR/
├── commands/           # デプロイされたスラッシュコマンド
├── agents/             # デプロイされたAIエージェント
├── hooks/              # フック設定
└── config/             # ツール設定
```

## データ管理

### リポジトリレジストリ
- **フォーマット**: JSON (repositories.json)
- **構造**: 動的に登録されたリポジトリのリスト
- **メタデータ**: URL、名前、最終更新、デプロイメント情報

### 状態追跡
- **場所**: `$CC_TOOLS_HOME/cache/state.json`
- **内容**: リポジトリの状態、バージョン、デプロイメントステータス
- **更新頻度**: 各操作後

### 設定ファイル
```typescript
interface Config {
  version: string;
  repositories: Repository[];
  settings: {
    autoUpdate: boolean;
    parallelOperations: boolean;
    conflictResolution: 'skip' | 'overwrite' | 'prompt';
  };
  mappings: {
    [repoName: string]: {
      source: string;
      target: string;
    }[];
  };
}
```

## セキュリティ考慮事項

- **Git認証**: プライベートリポジトリ用にSSHキーまたはトークンを使用
- **ファイル権限**: デプロイメント時に元の権限を保持
- **検証**: デプロイメント前にリポジトリの内容を検証
- **サンドボックス**: 信頼できないツール用の分離実行（将来機能）
- **依存関係の監査**: npm auditによる定期的なセキュリティチェック

## デプロイメントパターン

### サポートするディレクトリ構造
1. **.claude プレフィックスパターン**
   - `.claude/commands/*` → `~/.claude/commands/`
   - `.claude/agents/*` → `~/.claude/agents/`
   - `.claude/hooks/*` → `~/.claude/hooks/`
   - `.claude/config/*` → `~/.claude/config/`
   
2. **直接パターン**（.claudeなし）
   - `commands/*` → `~/.claude/commands/`
   - `agents/*` → `~/.claude/agents/`
   - `hooks/*` → `~/.claude/hooks/`
   
3. **ファイル名ベースパターン**（将来）
   - `*.command.md` → `~/.claude/commands/`
   - `*.agent.md` → `~/.claude/agents/`

### デプロイメント処理
- リポジトリ内のファイルをパターンマッチング
- **ディレクトリ構造を保持してデプロイ**
  - 例: `.claude/commands/kiro/spec-init.md` → `~/.claude/commands/kiro/spec-init.md`
  - 例: `commands/utils/helper.md` → `~/.claude/commands/utils/helper.md`
- 複数のパターンにマッチする場合は両方にデプロイ
- 競合時の処理オプション（skip/overwrite/prompt）

## パフォーマンス最適化

- **並列処理**: 複数のリポジトリを同時に処理
- **増分更新**: 変更があったファイルのみを更新
- **キャッシング**: リポジトリメタデータとファイルハッシュをキャッシュ
- **遅延読み込み**: 必要なモジュールのみを動的にロード