import { Repository } from '../../types';

/**
 * Pattern Match
 * ファイルパターンマッチング結果
 */
export interface PatternMatch {
  file: string;
  pattern: string;
  targetType: 'commands' | 'agents' | 'hooks';
}

/**
 * Deployed File Info
 * デプロイされたファイルの詳細情報
 */
export interface DeployedFile {
  source: string;      // ソースファイルパス（リポジトリ内の相対パス）
  target: string;      // ターゲットファイルパス（絶対パス）
  hash: string;        // ファイルのハッシュ値
  deployedAt: string;  // デプロイ日時（ISO 8601）
}

/**
 * Deployment Result
 * デプロイメント操作の結果
 */
export interface DeploymentResult {
  deployed: DeployedFile[];   // デプロイされたファイルの詳細情報
  skipped: string[];          // スキップされたファイル
  failed: string[];           // 失敗したファイル
  conflicts: string[];        // 競合したファイル
}

/**
 * Conflict Strategy
 * ファイル競合時の解決戦略
 */
export type ConflictStrategy = 'skip' | 'overwrite' | 'prompt';

/**
 * Deployment Service Interface
 * ファイルデプロイメントとパターンマッチングを担当
 */
export interface IDeploymentService {
  /**
   * リポジトリのファイルをデプロイする
   * @param repo - デプロイ元のリポジトリ
   * @param options - デプロイオプション
   * @returns デプロイメント結果
   */
  deploy(repo: Repository, options?: { force?: boolean }): Promise<DeploymentResult>;

  /**
   * リポジトリ内のパターンを検出する
   * @param repoPath - リポジトリのローカルパス
   * @returns マッチしたファイル情報の配列
   */
  detectPatterns(repoPath: string): Promise<PatternMatch[]>;

  /**
   * ディレクトリ構造を保持してファイルをコピーする
   * @param source - コピー元ファイルパス
   * @param target - コピー先ファイルパス
   */
  copyWithStructure(source: string, target: string): Promise<void>;

  /**
   * ファイル競合を処理する
   * @param file - 競合しているファイルパス
   * @param strategy - 競合解決戦略
   * @returns デプロイを続行する場合true
   */
  handleConflict(file: string, strategy: ConflictStrategy): Promise<boolean>;

  /**
   * 孤立したファイルをクリーンアップする
   * @param repo - クリーンアップ対象のリポジトリ
   * @returns 削除されたファイル数
   */
  cleanOrphanedFiles(repo: Repository): Promise<number>;
}