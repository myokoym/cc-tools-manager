/**
 * Claude Code Package Manager 型定義ファイル
 * 
 * このファイルは主要な型定義をエクスポートします。
 * 詳細な型定義は各専用ファイルに分割されています。
 */

export * from './repository';
export * from './config';
export * from './repository-details';
export * from './deployment';

// State関連の型定義
export interface State {
  version: string;
  repositories: {
    [repoId: string]: RepositoryState;
  };
  metadata: StateMetadata;
}

export interface RepositoryState {
  lastSync: string;           // ISO 8601
  lastCommit: string;         // Git commit SHA
  deployedFiles: DeployedFile[];
  errors?: string[];          // 最新のエラー
}

export interface DeployedFile {
  source: string;             // ソースファイルパス
  target: string;             // デプロイ先パス
  hash: string;               // ファイルハッシュ
  deployedAt: string;         // ISO 8601
}


export interface StateMetadata {
  lastCleanup: string;        // ISO 8601
  totalDeployedFiles: number;
}

// Git操作関連の型定義
export interface GitUpdateResult {
  filesChanged: number;
  insertions: number;
  deletions: number;
  currentCommit: string;
  previousCommit: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  isClean: boolean;
  modifiedFiles: string[];
  untrackedFiles: string[];
}

// デプロイメント関連の型定義
export interface DeploymentResult {
  deployed: string[];
  skipped: string[];
  failed: string[];
  conflicts: string[];
}

export interface PatternMatch {
  file: string;
  pattern: string;
  target: 'commands' | 'agents' | 'hooks';
}

// リポジトリ更新チェック関連の型定義
export interface RepositoryUpdate {
  repository: Repository;
  currentCommit: string;
  latestCommit: string;
  hasUpdate: boolean;
}

// 設定の競合解決方法
export type ConflictStrategy = 'skip' | 'overwrite' | 'prompt';

// ログレベル
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

// Repository と Configuration は専用ファイルから再エクスポート
import type { Repository } from './repository';
import type { Configuration } from './config';

export type { Repository, Configuration };