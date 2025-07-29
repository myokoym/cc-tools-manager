import { Repository } from '../../types';

/**
 * Git Update Result
 * Git pull操作の結果情報
 */
export interface GitUpdateResult {
  filesChanged: number;
  insertions: number;
  deletions: number;
  currentCommit: string;
  previousCommit: string;
}

/**
 * Git Status
 * リポジトリの現在のGitステータス
 */
export interface GitStatus {
  isClean: boolean;
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  untracked: string[];
}

/**
 * Git Manager Interface
 * Git操作とリポジトリ同期を担当
 */
export interface IGitManager {
  /**
   * リポジトリをクローンする
   * @param repo - クローンするリポジトリ
   * @throws GitCloneError - クローンに失敗した場合
   * @throws GitAuthenticationError - 認証に失敗した場合
   */
  clone(repo: Repository): Promise<void>;

  /**
   * リポジトリを更新する（git pull）
   * @param repo - 更新するリポジトリ
   * @returns Git更新結果
   * @throws GitPullError - pullに失敗した場合
   */
  pull(repo: Repository): Promise<GitUpdateResult>;

  /**
   * リポジトリのステータスを取得する
   * @param repo - ステータスを確認するリポジトリ
   * @returns Gitステータス情報
   */
  getStatus(repo: Repository): Promise<GitStatus>;

  /**
   * 最新のコミットSHAを取得する
   * @param repo - リポジトリ
   * @returns コミットSHA文字列
   */
  getLatestCommit(repo: Repository): Promise<string>;

  /**
   * リポジトリの作業ディレクトリがクリーンか確認する
   * @param repo - 確認するリポジトリ
   * @returns クリーンな場合true
   */
  isRepoClean(repo: Repository): Promise<boolean>;
}