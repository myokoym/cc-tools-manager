# CC Tools Manager - プロジェクト構造

## ルートディレクトリ構成

```
cc-tools-manager/
├── package.json             # プロジェクト定義とスクリプト
├── tsconfig.json           # TypeScript設定
├── .eslintrc.js            # ESLint設定
├── .prettierrc             # Prettier設定
├── jest.config.js          # Jest設定
├── README.md               # プロジェクトドキュメント
├── repositories.json       # 動的に管理されるリポジトリ情報（初期は存在しない）
├── src/                    # ソースコード
├── dist/                   # ビルド成果物
├── tests/                  # テストスイート
├── docs/                   # 詳細ドキュメント
└── .kiro/                  # Kiro仕様駆動開発
    ├── steering/           # プロジェクトステアリングドキュメント
    └── specs/              # 機能仕様
```

## サブディレクトリ構造

### `src/` - ソースコード
```
src/
├── index.ts                # エントリーポイント
├── cli.ts                  # CLIセットアップ（Commander.js）
├── commands/               # コマンド実装
│   ├── register.ts        # リポジトリ登録
│   ├── update.ts          # リポジトリ更新
│   ├── list.ts            # リポジトリ一覧
│   ├── status.ts          # ステータス表示
│   ├── remove.ts          # リポジトリ削除
│   ├── clean.ts           # クリーンアップ
│   └── interactive.ts     # インタラクティブモード
├── core/                   # コア機能
│   ├── registry.ts        # リポジトリレジストリ管理
│   ├── git-manager.ts     # Git操作マネージャー
│   ├── deployment.ts      # ファイルデプロイメント（パターンマッチングによる自動振り分け）
│   └── config.ts          # 設定管理
├── utils/                  # ユーティリティ
│   ├── logger.ts          # ロギング（Winston）
│   ├── file-system.ts     # ファイルシステム操作
│   ├── validators.ts      # 入力検証
│   └── helpers.ts         # ヘルパー関数
├── types/                  # TypeScript型定義
│   ├── index.ts           # 共通型
│   ├── repository.ts      # リポジトリ関連型
│   └── config.ts          # 設定関連型
└── constants/             # 定数定義
    ├── paths.ts           # パス定数
    └── messages.ts        # メッセージ定数
```

### `tests/` - テストスイート
```
tests/
├── unit/                   # ユニットテスト
│   ├── commands/          # コマンドテスト
│   │   ├── register.test.ts
│   │   └── update.test.ts
│   ├── core/              # コア機能テスト
│   │   ├── registry.test.ts
│   │   └── git-manager.test.ts
│   └── utils/             # ユーティリティテスト
├── integration/           # 統合テスト
│   ├── full-cycle.test.ts # 完全なワークフローテスト
│   └── multi-repo.test.ts # 複数リポジトリテスト
├── e2e/                   # エンドツーエンドテスト
│   └── cli.test.ts        # CLI全体のテスト
└── fixtures/              # テストデータ
    ├── mock-repos/        # モックリポジトリ
    └── test-config/       # テスト設定
```

### `docs/` - ドキュメント
```
docs/
├── getting-started.md      # クイックスタートガイド
├── commands.md            # コマンドリファレンス
├── configuration.md       # 設定ガイド
├── development.md         # 開発者ガイド
└── api/                   # API ドキュメント（TypeDoc）
```

## コード構成パターン

### モジュール構造
各モジュールは一貫したパターンに従います：

```typescript
// src/core/registry.ts
import { Repository, RegistryConfig } from '../types';
import { Logger } from '../utils/logger';
import { REGISTRY_PATH } from '../constants/paths';

export class Registry {
  private logger: Logger;
  private config: RegistryConfig;
  
  constructor(config: RegistryConfig) {
    this.logger = new Logger('Registry');
    this.config = config;
  }
  
  // Public メソッド
  async register(url: string): Promise<Repository> {
    // 実装
  }
  
  // Private メソッド
  private validateUrl(url: string): boolean {
    // 実装
  }
}
```

### コマンドパターン
コマンドは標準化されたインターフェースに従います：

```typescript
// src/commands/register.ts
import { Command } from 'commander';
import { Registry } from '../core/registry';
import { Logger } from '../utils/logger';

export function registerCommand(program: Command): void {
  program
    .command('register <url>')
    .description('新しいリポジトリを登録')
    .option('-t, --type <type>', 'リポジトリタイプ', 'auto')
    .action(async (url: string, options) => {
      const logger = new Logger('register');
      
      try {
        const registry = new Registry();
        await registry.register(url);
        logger.success('リポジトリを登録しました');
      } catch (error) {
        logger.error('登録に失敗しました', error);
        process.exit(1);
      }
    });
}
```

## ファイル命名規則

### ソースファイル
- **TypeScriptファイル**: `kebab-case.ts`
- **テストファイル**: `*.test.ts` または `*.spec.ts`
- **型定義**: `types/*.ts`
- **定数**: `UPPER_SNAKE_CASE` in `constants/*.ts`

### 設定ファイル
- **プロジェクト設定**: `*.config.js` または `.*rc`
- **環境設定**: `.env.*`
- **Git設定**: `.gitignore`, `.gitattributes`

### ドキュメント
- **Markdownファイル**: `kebab-case.md`
- **ステアリングドキュメント**: `.kiro/steering/機能名.md`
- **仕様**: `.kiro/specs/機能名/`

## インポート構成

### インポート順序
1. Node.js組み込みモジュール
2. 外部パッケージ
3. 内部モジュール（絶対パス）
4. 内部モジュール（相対パス）
5. 型定義

### インポート例
```typescript
// Node.js組み込み
import { promises as fs } from 'fs';
import path from 'path';

// 外部パッケージ
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

// 内部モジュール（src/からの相対）
import { Registry } from '../core/registry';
import { Logger } from '../utils/logger';
import { validateUrl } from '../utils/validators';

// 型定義
import type { Repository, RegistryConfig } from '../types';
```

## 主要なアーキテクチャ原則

### 1. モジュラリティ
- 各モジュールは単一の責任を持つ
- モジュール間の明確なインターフェース
- 最小限の依存関係

### 2. 拡張性
- 新しいコマンドはコアを変更せずに追加可能
- リポジトリタイプはプラガブル
- デプロイメント戦略は設定可能

### 3. 安全性優先
- すべての操作は元に戻せる
- プレビュー用のドライランモード
- アクション前の包括的な検証

### 4. ユーザーエクスペリエンス
- 明確なカラー付き出力
- 長時間操作のプログレスインジケーター
- 回復提案付きの有用なエラーメッセージ

### 5. 保守性
- 一貫したコーディングスタイル（ESLint + Prettier）
- 包括的なドキュメント（JSDoc + TypeDoc）
- 重要なパスのテストカバレッジ

### 6. 設定より規約
- シンプルなMarkdownでのリポジトリリスト
- カスタマイズ用の環境変数
- ハードコードされた値を最小限に

## NPXサポートの実装

### package.json設定
```json
{
  "name": "cc-tools-manager",
  "version": "1.0.0",
  "bin": {
    "cc-tools-manager": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "prepublishOnly": "npm run build"
  }
}
```

### エントリーポイント
```typescript
#!/usr/bin/env node
// src/index.ts
import { cli } from './cli';

cli.parse(process.argv);
```

## 将来の構造考慮事項

### 計画中の追加
- `plugins/` - カスタムハンドラー用の拡張システム
- `templates/` - リポジトリタイプテンプレート
- `.github/` - CI/CDワークフロー
- `examples/` - 使用例とレシピ

### マイグレーションパス
- 後方互換性の維持
- 段階的なモジュール置換
- 既存のファイル構造の保持

## 関連情報

- **ランタイムディレクトリ構造**: 実行時に使用されるディレクトリ（`~/.cc-tools/`、`~/.claude/`など）については、[tech.md](./tech.md#ランタイムディレクトリ構造)を参照してください。