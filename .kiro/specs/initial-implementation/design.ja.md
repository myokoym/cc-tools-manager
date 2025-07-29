# Technical Design Document

## Overview

CC Tools Managerは、Claude Code関連ツールを一元管理するNode.js/TypeScript CLIアプリケーションです。本設計書では、要件ドキュメントに基づいた技術的な実装アプローチを定義します。

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                            │
│  ┌─────────┐ ┌────────┐ ┌──────┐ ┌────────┐ ┌─────────┐  │
│  │register │ │ update │ │ list │ │ status │ │ remove  │  │
│  └────┬────┘ └────┬───┘ └──┬───┘ └────┬───┘ └────┬────┘  │
└──────┼───────────┼────────┼──────────┼──────────┼────────┘
       │           │        │          │          │
┌──────▼───────────▼────────▼──────────▼──────────▼────────┐
│                     Core Services Layer                     │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐ │
│  │  Registry   │ │ GitManager  │ │ DeploymentService    │ │
│  │  Service    │ │             │ │                      │ │
│  └──────┬──────┘ └──────┬──────┘ └──────────┬───────────┘ │
└─────────┼───────────────┼───────────────────┼────────────┘
          │               │                    │
┌─────────▼───────────────▼───────────────────▼────────────┐
│                     Data Layer                             │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐ │
│  │repositories │ │   state     │ │   File System        │ │
│  │   .json     │ │   .json     │ │                      │ │
│  └─────────────┘ └─────────────┘ └──────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### CLI Layer (Commander.js)
- **責任**: ユーザーインターフェース、コマンド解析、出力フォーマット
- **主要コンポーネント**:
  - `cli.ts`: Commanderセットアップとコマンド登録
  - `commands/*.ts`: 各コマンドの実装

#### Core Services Layer
- **Registry Service**: リポジトリ登録・削除・一覧管理
- **Git Manager**: Git操作（clone, pull, status）
- **Deployment Service**: ファイルパターンマッチングとデプロイメント

#### Data Layer
- **repositories.json**: 登録リポジトリ情報
- **state.json**: 各リポジトリの状態とメタデータ
- **File System**: ローカルリポジトリとデプロイ先

## Data Models

### Repository Model
```typescript
interface Repository {
  id: string;              // 一意識別子（URLのハッシュ）
  name: string;            // リポジトリ名
  url: string;             // GitHub URL
  registeredAt: string;    // ISO 8601 登録日時
  lastUpdatedAt?: string;  // ISO 8601 最終更新日時
  deployments: {
    commands?: string[];   // デプロイするコマンドパターン
    agents?: string[];     // デプロイするエージェントパターン
    hooks?: string[];      // デプロイするフックパターン
  };
  status: 'active' | 'error' | 'uninitialized';
  localPath?: string;      // ローカルクローンパス
}
```

### State Model
```typescript
interface State {
  version: string;
  repositories: {
    [repoId: string]: {
      lastSync: string;           // ISO 8601
      lastCommit: string;         // Git commit SHA
      deployedFiles: {
        source: string;           // ソースファイルパス
        target: string;           // デプロイ先パス
        hash: string;             // ファイルハッシュ
        deployedAt: string;       // ISO 8601
      }[];
      errors?: string[];          // 最新のエラー
    };
  };
  metadata: {
    lastCleanup: string;          // ISO 8601
    totalDeployedFiles: number;
  };
}
```

### Configuration Model
```typescript
interface Configuration {
  version: string;
  paths: {
    home: string;                 // CC_TOOLS_HOME
    claudeDir: string;            // CC_TOOLS_CLAUDE_DIR
  };
  behavior: {
    autoUpdate: boolean;
    parallelOperations: boolean;
    conflictResolution: 'skip' | 'overwrite' | 'prompt';
    dryRun: boolean;
    forceYes: boolean;
  };
  logging: {
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    file: string;
  };
}
```

## API Design

### Core Service Interfaces

#### Registry Service
```typescript
interface IRegistryService {
  // Requirement 1: リポジトリ登録管理
  register(url: string): Promise<Repository>;
  remove(nameOrId: string): Promise<void>;
  list(): Promise<Repository[]>;
  find(nameOrId: string): Promise<Repository | null>;
  validateUrl(url: string): boolean;
  checkDuplicate(url: string): Promise<boolean>;
}
```

#### Git Manager
```typescript
interface IGitManager {
  // Requirement 2: Git操作とリポジトリ同期
  clone(repo: Repository): Promise<void>;
  pull(repo: Repository): Promise<GitUpdateResult>;
  getStatus(repo: Repository): Promise<GitStatus>;
  getLatestCommit(repo: Repository): Promise<string>;
  isRepoClean(repo: Repository): Promise<boolean>;
}

interface GitUpdateResult {
  filesChanged: number;
  insertions: number;
  deletions: number;
  currentCommit: string;
  previousCommit: string;
}
```

#### Deployment Service
```typescript
interface IDeploymentService {
  // Requirement 3: ファイルデプロイメント
  deploy(repo: Repository): Promise<DeploymentResult>;
  detectPatterns(repoPath: string): Promise<PatternMatch[]>;
  copyWithStructure(source: string, target: string): Promise<void>;
  handleConflict(file: string, strategy: ConflictStrategy): Promise<boolean>;
  cleanOrphanedFiles(repo: Repository): Promise<number>;
}

interface DeploymentResult {
  deployed: string[];
  skipped: string[];
  failed: string[];
  conflicts: string[];
}
```

## Technical Components

### 1. CLI Implementation (Requirement 4)

```typescript
// src/cli.ts
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export function createCLI(): Command {
  const program = new Command();
  
  program
    .name('cc-tools-manager')
    .description('Claude Code Tools Manager')
    .version(packageJson.version)
    .option('--dry-run', 'プレビューモード')
    .option('--no-color', 'カラー出力を無効化');

  // コマンド登録
  registerCommand(program);
  updateCommand(program);
  listCommand(program);
  statusCommand(program);
  removeCommand(program);
  cleanCommand(program);
  interactiveCommand(program);

  return program;
}
```

### 2. Repository Registration (Requirement 1)

```typescript
// src/core/registry.ts
export class RegistryService implements IRegistryService {
  private repositoriesPath: string;
  private repositories: Repository[];

  async register(url: string): Promise<Repository> {
    // URL検証
    if (!this.validateUrl(url)) {
      throw new InvalidUrlError(url);
    }

    // 重複チェック
    if (await this.checkDuplicate(url)) {
      throw new DuplicateRepositoryError(url);
    }

    // リポジトリ情報作成
    const repo: Repository = {
      id: crypto.createHash('sha256').update(url).digest('hex').substring(0, 8),
      name: this.extractRepoName(url),
      url,
      registeredAt: new Date().toISOString(),
      deployments: await this.detectDeploymentPatterns(url),
      status: 'uninitialized'
    };

    // 保存
    this.repositories.push(repo);
    await this.save();

    return repo;
  }
}
```

### 3. Git Operations (Requirement 2)

```typescript
// src/core/git-manager.ts
import simpleGit, { SimpleGit } from 'simple-git';

export class GitManager implements IGitManager {
  private git: SimpleGit;

  async clone(repo: Repository): Promise<void> {
    const targetPath = this.getRepoPath(repo);
    
    const spinner = ora(`Cloning ${repo.name}...`).start();
    
    try {
      await this.git.clone(repo.url, targetPath);
      spinner.succeed(`Cloned ${repo.name}`);
    } catch (error) {
      spinner.fail(`Failed to clone ${repo.name}`);
      throw new GitCloneError(repo.url, error);
    }
  }

  async pull(repo: Repository): Promise<GitUpdateResult> {
    const repoPath = this.getRepoPath(repo);
    const git = simpleGit(repoPath);
    
    const spinner = ora(`Updating ${repo.name}...`).start();
    
    try {
      const previousCommit = await git.revparse(['HEAD']);
      const pullResult = await git.pull();
      const currentCommit = await git.revparse(['HEAD']);
      
      if (pullResult.files.length > 0) {
        spinner.succeed(`Updated ${repo.name}: ${pullResult.files.length} files changed`);
      } else {
        spinner.info(`${repo.name} is already up to date`);
      }
      
      return {
        filesChanged: pullResult.files.length,
        insertions: pullResult.insertions,
        deletions: pullResult.deletions,
        currentCommit,
        previousCommit
      };
    } catch (error) {
      spinner.fail(`Failed to update ${repo.name}`);
      throw new GitPullError(repo.name, error);
    }
  }
}
```

### 4. Deployment System (Requirement 3)

```typescript
// src/core/deployment.ts
export class DeploymentService implements IDeploymentService {
  private patterns = [
    { pattern: '.claude/commands/**/*.md', target: 'commands' },
    { pattern: 'commands/**/*.md', target: 'commands' },
    { pattern: '.claude/agents/**/*.md', target: 'agents' },
    { pattern: 'agents/**/*.md', target: 'agents' },
    { pattern: '.claude/hooks/**/*', target: 'hooks' },
    { pattern: 'hooks/**/*', target: 'hooks' }
  ];

  async deploy(repo: Repository): Promise<DeploymentResult> {
    const repoPath = this.getRepoPath(repo);
    const result: DeploymentResult = {
      deployed: [],
      skipped: [],
      failed: [],
      conflicts: []
    };

    // パターンマッチング
    const matches = await this.detectPatterns(repoPath);

    for (const match of matches) {
      try {
        const sourcePath = path.join(repoPath, match.file);
        const targetPath = this.calculateTargetPath(match);

        // 競合チェック
        if (await this.fileExists(targetPath)) {
          const shouldDeploy = await this.handleConflict(
            targetPath,
            this.config.conflictResolution
          );
          
          if (!shouldDeploy) {
            result.skipped.push(match.file);
            continue;
          }
        }

        // ディレクトリ構造を保持してコピー
        await this.copyWithStructure(sourcePath, targetPath);
        result.deployed.push(match.file);
        
      } catch (error) {
        result.failed.push(match.file);
        this.logger.error(`Failed to deploy ${match.file}`, error);
      }
    }

    return result;
  }

  private calculateTargetPath(match: PatternMatch): string {
    // ディレクトリ構造を保持する計算
    // 例: commands/kiro/spec-init.md → ~/.claude/commands/kiro/spec-init.md
    const relativePath = match.file
      .replace(/^\.claude\//, '')
      .replace(/^(commands|agents|hooks)\//, '$1/');
    
    return path.join(this.config.claudeDir, relativePath);
  }
}
```

### 5. Configuration Management (Requirement 5)

```typescript
// src/core/config.ts
export class ConfigurationManager {
  private config: Configuration;
  private configPath: string;

  constructor() {
    this.loadEnvironmentVariables();
    this.loadConfigFile();
    this.applyDefaults();
  }

  private loadEnvironmentVariables(): void {
    this.config = {
      paths: {
        home: process.env.CC_TOOLS_HOME || path.join(os.homedir(), '.cc-tools'),
        claudeDir: process.env.CC_TOOLS_CLAUDE_DIR || path.join(os.homedir(), '.claude')
      },
      behavior: {
        autoUpdate: false,
        parallelOperations: process.env.CC_TOOLS_PARALLEL === 'true',
        conflictResolution: 'prompt',
        dryRun: process.env.CC_TOOLS_DRY_RUN === 'true',
        forceYes: process.env.CC_TOOLS_FORCE === 'true'
      },
      logging: {
        level: (process.env.CC_TOOLS_LOG_LEVEL as LogLevel) || 'INFO',
        file: path.join(this.config.paths.home, 'logs', 'cc-tools.log')
      }
    };
  }
}
```

### 6. Error Handling (Requirement 6)

```typescript
// src/utils/errors.ts
export class CCToolsError extends Error {
  constructor(
    message: string,
    public code: string,
    public recovery?: string
  ) {
    super(message);
    this.name = 'CCToolsError';
  }
}

export class GitAuthenticationError extends CCToolsError {
  constructor(repo: string) {
    super(
      `Git認証に失敗しました: ${repo}`,
      'GIT_AUTH_FAILED',
      'SSHキーまたはGitHubトークンを設定してください:\n' +
      '1. SSHキー: ssh-keygen -t ed25519 -C "your_email@example.com"\n' +
      '2. GitHubで公開鍵を登録\n' +
      '3. または、GITHUB_TOKEN環境変数を設定'
    );
  }
}

// src/utils/error-handler.ts
export function handleError(error: unknown): void {
  const logger = new Logger('error-handler');
  
  if (error instanceof CCToolsError) {
    logger.error(chalk.red(`エラー: ${error.message}`));
    if (error.recovery) {
      logger.info(chalk.yellow('\n回復方法:'));
      logger.info(error.recovery);
    }
  } else if (error instanceof Error) {
    logger.error(chalk.red(`予期しないエラー: ${error.message}`));
    if (process.env.CC_TOOLS_LOG_LEVEL === 'DEBUG') {
      logger.debug(error.stack || '');
    }
  }
  
  process.exit(1);
}
```

### 7. State Management (Requirement 7)

```typescript
// src/core/state-manager.ts
export class StateManager {
  private statePath: string;
  private state: State;

  async updateRepositoryState(
    repo: Repository,
    updateResult: GitUpdateResult,
    deploymentResult: DeploymentResult
  ): Promise<void> {
    const repoState = {
      lastSync: new Date().toISOString(),
      lastCommit: updateResult.currentCommit,
      deployedFiles: await this.calculateDeployedFiles(repo, deploymentResult),
      errors: deploymentResult.failed
    };

    this.state.repositories[repo.id] = repoState;
    this.state.metadata.totalDeployedFiles = this.countTotalFiles();

    await this.saveAtomic();
  }

  private async saveAtomic(): Promise<void> {
    const tempPath = `${this.statePath}.tmp`;
    
    // 一時ファイルに書き込み
    await fs.writeFile(
      tempPath,
      JSON.stringify(this.state, null, 2),
      'utf-8'
    );

    // アトミックに置換
    await fs.rename(tempPath, this.statePath);
  }

  async checkForUpdates(): Promise<RepositoryUpdate[]> {
    const updates: RepositoryUpdate[] = [];
    
    for (const repo of await this.registry.list()) {
      const repoState = this.state.repositories[repo.id];
      if (!repoState) continue;

      const currentCommit = await this.gitManager.getLatestCommit(repo);
      if (currentCommit !== repoState.lastCommit) {
        updates.push({
          repository: repo,
          currentCommit: repoState.lastCommit,
          latestCommit: currentCommit,
          hasUpdate: true
        });
      }
    }

    return updates;
  }
}
```

## Implementation Approach

### Phase 1: Foundation (Week 1)
1. プロジェクトセットアップ (TypeScript, ESLint, Jest)
2. 基本的なCLI構造 (Commander.js)
3. データモデルと型定義
4. 設定管理システム

### Phase 2: Core Features (Week 2-3)
1. Registry Service実装
2. Git Manager実装
3. 基本的なregister/list/removeコマンド
4. エラーハンドリングフレームワーク

### Phase 3: Deployment System (Week 3-4)
1. Deployment Service実装
2. パターンマッチングロジック
3. 競合解決メカニズム
4. updateコマンド実装

### Phase 4: Advanced Features (Week 4-5)
1. State Manager実装
2. status/checkコマンド
3. インタラクティブモード
4. 並列処理サポート

### Phase 5: Polish & Testing (Week 5-6)
1. 包括的なテストスイート
2. ドキュメント作成
3. NPXサポートの最終調整
4. パフォーマンス最適化

## Testing Strategy

### Unit Tests
- 各サービスクラスの個別テスト
- モックを使用したGit操作のテスト
- エラーケースの網羅的テスト

### Integration Tests
- 実際のファイルシステムを使用したデプロイメントテスト
- Git操作の統合テスト（テスト用リポジトリ使用）
- 設定ファイルとの統合テスト

### E2E Tests
- CLIコマンドの完全なフローテスト
- 複数リポジトリのシナリオテスト
- エラー回復シナリオ

## Security Considerations

1. **Git認証**: 環境変数とSSHキーのサポート
2. **ファイル権限**: デプロイ時の権限保持
3. **入力検証**: URLとファイルパスの厳密な検証
4. **安全なファイル操作**: アトミックな書き込みとロールバック

## Performance Optimizations

1. **並列Git操作**: 複数リポジトリの同時更新
2. **増分更新**: ファイルハッシュによる変更検出
3. **キャッシング**: メタデータとGit情報のキャッシュ
4. **遅延読み込み**: 必要時のみのモジュールロード

## Monitoring and Logging

1. **構造化ログ**: Winston使用
2. **操作追跡**: すべての変更操作をログ
3. **パフォーマンスメトリクス**: 操作時間の記録
4. **エラー追跡**: スタックトレースとコンテキスト