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
 * Deployment Result
 * デプロイメント操作の結果
 */
export interface DeploymentResult {
  deployed: string[];
  skipped: string[];
  failed: string[];
  conflicts: string[];
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
   * @returns デプロイメント結果
   */
  deploy(repo: Repository): Promise<DeploymentResult>;

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