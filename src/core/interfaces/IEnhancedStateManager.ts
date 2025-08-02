import { IStateManager } from './IStateManager';
import { 
  DeploymentState, 
  InstallationRecord, 
  DeployedFile,
  StateStatistics,
  StateQueryOptions,
  StateReconstructResult
} from '../../types/state';

/**
 * Enhanced State Manager Interface
 * 
 * IStateManagerを拡張し、インストール/アンインストール操作の追跡、
 * 詳細な状態管理、監査証跡機能を提供する拡張インターフェース
 */
export interface IEnhancedStateManager extends IStateManager {
  
  // === デプロイメント状態管理 ===
  
  /**
   * リポジトリのデプロイメント状態を取得する
   * @param repositoryId - リポジトリID
   * @returns デプロイメント状態、存在しない場合はnull
   */
  getDeploymentState(repositoryId: string): Promise<DeploymentState | null>;

  /**
   * リポジトリのデプロイメント状態を更新する
   * @param repositoryId - リポジトリID
   * @param state - 更新するデプロイメント状態
   */
  updateDeploymentState(repositoryId: string, state: Partial<DeploymentState>): Promise<void>;

  /**
   * リポジトリのデプロイ済みファイル一覧を取得する
   * @param repositoryId - リポジトリID
   * @param options - クエリオプション
   * @returns デプロイ済みファイル一覧
   */
  getDeployedFiles(repositoryId: string, options?: StateQueryOptions): Promise<DeployedFile[]>;

  // === インストール記録管理 ===

  /**
   * インストール記録を追加する
   * @param record - インストール記録
   */
  addInstallationRecord(record: InstallationRecord): Promise<void>;

  /**
   * リポジトリのインストール記録を取得する
   * @param repositoryId - リポジトリID
   * @param limit - 取得件数制限（デフォルト: 100）
   * @returns インストール記録一覧
   */
  getInstallationRecords(repositoryId: string, limit?: number): Promise<InstallationRecord[]>;

  /**
   * 全リポジトリのインストール記録を取得する
   * @param options - クエリオプション
   * @returns インストール記録一覧
   */
  getAllInstallationRecords(options?: StateQueryOptions): Promise<InstallationRecord[]>;

  // === 状態削除・クリーンアップ ===

  /**
   * リポジトリのデプロイメント記録を削除する
   * @param repositoryId - リポジトリID
   * @param keepRecords - 監査記録を保持するかどうか（デフォルト: true）
   * @returns 削除されたファイルパスの配列
   */
  removeDeploymentRecords(repositoryId: string, keepRecords?: boolean): Promise<string[]>;

  /**
   * 古いインストール記録をクリーンアップする
   * @param retentionDays - 保持日数（デフォルト: 90日）
   * @returns クリーンアップされた記録数
   */
  cleanupOldRecords(retentionDays?: number): Promise<number>;

  // === 状態統計・分析 ===

  /**
   * 状態統計情報を取得する
   * @param options - クエリオプション
   * @returns 状態統計情報
   */
  getStateStatistics(options?: StateQueryOptions): Promise<StateStatistics>;

  /**
   * 孤立ファイルを検出する（デプロイ先に存在するが状態に記録されていないファイル）
   * @param deploymentPaths - デプロイメントパス配列
   * @returns 孤立ファイルパスの配列
   */
  detectOrphanedFiles(deploymentPaths: string[]): Promise<string[]>;

  /**
   * 不整合状態を検出する
   * @returns 不整合があるリポジトリIDの配列
   */
  detectInconsistentState(): Promise<string[]>;

  // === 状態復旧・再構築 ===

  /**
   * ファイルシステムから状態を再構築する
   * @param deploymentPaths - デプロイメントパス配列
   * @param force - 既存状態を強制上書きするかどうか
   * @returns 再構築結果
   */
  reconstructState(deploymentPaths: string[], force?: boolean): Promise<StateReconstructResult>;

  /**
   * 状態をバックアップする
   * @param backupPath - バックアップファイルパス（省略時は自動生成）
   * @returns バックアップファイルパス
   */
  backupState(backupPath?: string): Promise<string>;

  /**
   * バックアップから状態を復元する
   * @param backupPath - バックアップファイルパス
   * @param verify - 復元前に検証するかどうか
   */
  restoreState(backupPath: string, verify?: boolean): Promise<void>;

  // === インストール状態管理 ===

  /**
   * リポジトリのインストール状態を更新する
   * @param repositoryId - リポジトリID
   * @param status - インストール状態
   * @param metadata - 追加メタデータ
   */
  updateInstallationStatus(
    repositoryId: string, 
    status: 'installed' | 'uninstalled' | 'partial' | 'error',
    metadata?: Record<string, any>
  ): Promise<void>;

  /**
   * インストール済みリポジトリ一覧を取得する
   * @returns インストール済みリポジトリIDの配列
   */
  getInstalledRepositories(): Promise<string[]>;

  /**
   * アンインストール済みリポジトリ一覧を取得する
   * @returns アンインストール済みリポジトリIDの配列
   */
  getUninstalledRepositories(): Promise<string[]>;

  // === マイグレーション・互換性 ===

  /**
   * 状態フォーマットのバージョンを取得する
   * @returns 現在の状態フォーマットバージョン
   */
  getStateVersion(): Promise<string>;

  /**
   * 状態フォーマットのマイグレーションが必要かチェックする
   * @returns マイグレーションが必要な場合はtrue
   */
  needsMigration(): Promise<boolean>;

  /**
   * 状態フォーマットをマイグレーションする
   * @param targetVersion - 対象バージョン（省略時は最新）
   * @param createBackup - マイグレーション前にバックアップを作成するかどうか
   */
  migrateState(targetVersion?: string, createBackup?: boolean): Promise<void>;
}