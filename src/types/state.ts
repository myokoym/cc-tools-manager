/**
 * Enhanced State Management Types
 * 
 * Claude Code Package Managerの拡張状態管理に使用する型定義
 * インストール/アンインストール操作の追跡とデプロイメント状態管理を提供
 */

import type { Repository } from './repository';
export type { Repository };

// インストール状態
export type InstallationStatus = 'installed' | 'uninstalled' | 'partial' | 'error';

// インストール操作の種別
export type InstallationOperation = 'install' | 'uninstall' | 'unregister';

// デプロイされたファイル情報
export interface DeployedFile {
  path: string;             // デプロイ先パス (.claude/commands/xxx.js など)
  hash: string;             // ファイルハッシュ
  deployedAt: string;       // ISO 8601 デプロイ日時
  source?: string;          // ソースファイルパス (互換性のため)
  target?: string;          // デプロイ先パス (互換性のため)
  type?: 'command' | 'agent' | 'hook' | 'text-content'; // ファイルタイプ
}

// インストール記録（監査証跡用）
export interface InstallationRecord {
  id: string;               // 一意識別子
  repositoryId: string;     // リポジトリID
  operation: InstallationOperation; // 操作種別
  timestamp: string;        // ISO 8601 操作日時
  filesAffected: number;    // 影響を受けたファイル数
  success: boolean;         // 操作成功フラグ
  error?: string;           // エラーメッセージ（失敗時）
  options?: Record<string, any>; // 操作オプション
  metadata?: {
    commitHash?: string;    // Git commit SHA
    version?: string;       // バージョン情報
    userAgent?: string;     // 実行環境情報
  };
}

// デプロイメント状態
export interface DeploymentState {
  repositoryId: string;             // リポジトリID
  lastInstalled?: string;           // ISO 8601 最終インストール日時
  lastUninstalled?: string;         // ISO 8601 最終アンインストール日時
  deployedFiles: DeployedFile[];    // デプロイ済みファイル一覧
  installationStatus: InstallationStatus; // インストール状態
  version?: string;                 // バージョン情報
  errors?: string[];                // 最新のエラー一覧
  metadata?: {
    totalInstallations: number;     // 総インストール回数
    totalUninstallations: number;   // 総アンインストール回数
    firstInstalled?: string;        // ISO 8601 初回インストール日時
    lastCommitHash?: string;        // 最後に処理したコミットハッシュ
  };
}

// 状態データのバージョン定義
export interface StateVersion {
  version: string;          // バージョン番号（例: "2.0.0"）
  format: 'v1' | 'v2';     // フォーマット識別子
  migrationRequired?: boolean; // マイグレーションが必要かどうか
}

// 拡張アプリケーション状態
export interface EnhancedAppState {
  version: StateVersion;
  repositories: { [key: string]: DeploymentState };
  metadata: {
    lastCleanup: string | null;
    createdAt: string;
    updatedAt: string;
    totalDeployments: number;
    totalRemovals: number;
  };
  audit?: {
    enabled: boolean;
    maxRecords: number;
    retentionDays: number;
  };
}

// 状態統計情報
export interface StateStatistics {
  totalRepositories: number;
  installedRepositories: number;
  uninstalledRepositories: number;
  partialRepositories: number;
  errorRepositories: number;
  totalDeployedFiles: number;
  totalInstallationRecords: number;
  oldestRecord?: string;    // ISO 8601
  newestRecord?: string;    // ISO 8601
}

// 状態クエリオプション
export interface StateQueryOptions {
  includeUninstalled?: boolean;
  includeErrors?: boolean;
  dateRange?: {
    start: string;          // ISO 8601
    end: string;            // ISO 8601
  };
  repositoryIds?: string[];
  fileTypes?: Array<'command' | 'agent' | 'hook' | 'text-content'>;
}

// 状態再構築結果
export interface StateReconstructResult {
  success: boolean;
  message: string;
  statistics: {
    repositoriesProcessed: number;
    filesRecovered: number;
    errorsFound: number;
  };
  errors?: string[];
  warnings?: string[];
}

// State file version 2 format
export interface StateFileV2 {
  version: number;
  repositories: Repository[];
  deploymentStates: { [repositoryId: string]: DeploymentState };
  installationHistory: InstallationRecord[];
  metadata: {
    lastUpdated: string;
    lastMigration: string | null;
  };
}