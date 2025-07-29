import { Repository } from '../../types';
import { GitUpdateResult } from './IGitManager';
import { DeploymentResult } from './IDeploymentService';

/**
 * Repository State
 * 各リポジトリの状態情報
 */
export interface RepositoryState {
  lastSync: string;           // ISO 8601 最終同期日時
  lastCommit: string;         // Git commit SHA
  deployedFiles: {
    source: string;           // ソースファイルパス
    target: string;           // デプロイ先パス
    hash: string;             // ファイルハッシュ
    deployedAt: string;       // ISO 8601 デプロイ日時
  }[];
  errors?: string[];          // 最新のエラー
}

/**
 * Repository Update
 * リポジトリの更新情報
 */
export interface RepositoryUpdate {
  repository: Repository;
  currentCommit: string;
  latestCommit: string;
  hasUpdate: boolean;
}

/**
 * State Manager Interface
 * アプリケーションの状態管理を担当
 */
export interface IStateManager {
  /**
   * リポジトリの状態を更新する
   * @param repo - リポジトリ
   * @param updateResult - Git更新結果
   * @param deploymentResult - デプロイメント結果
   */
  updateRepositoryState(
    repo: Repository,
    updateResult: GitUpdateResult,
    deploymentResult: DeploymentResult
  ): Promise<void>;

  /**
   * リポジトリの状態を取得する
   * @param repoId - リポジトリID
   * @returns リポジトリの状態、存在しない場合はnull
   */
  getRepositoryState(repoId: string): Promise<RepositoryState | null>;

  /**
   * 更新が必要なリポジトリをチェックする
   * @returns 更新が必要なリポジトリ情報の配列
   */
  checkForUpdates(): Promise<RepositoryUpdate[]>;

  /**
   * デプロイ済みファイルの総数を取得する
   * @returns デプロイ済みファイル数
   */
  getTotalDeployedFiles(): Promise<number>;

  /**
   * 最終クリーンアップ日時を取得する
   * @returns ISO 8601形式の日時、未実施の場合はnull
   */
  getLastCleanupDate(): Promise<string | null>;

  /**
   * クリーンアップ日時を更新する
   */
  updateCleanupDate(): Promise<void>;
}