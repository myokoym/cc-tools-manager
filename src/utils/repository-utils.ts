/**
 * Repository utility functions
 * リポジトリ操作のための共通ユーティリティ
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { Repository } from '../types/repository';
import { GitManager } from '../core/GitManager';
import { RegistryService } from '../core/RegistryService';
import { REPOS_DIR } from '../constants/paths';
import { ensureDir } from './file-system';

/**
 * ディレクトリがGitリポジトリかどうかを確認
 */
export async function isGitRepository(dirPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(dirPath, '.git'));
    return true;
  } catch {
    return false;
  }
}

/**
 * リポジトリが存在しない場合はクローンする
 * @param repo - リポジトリ
 * @param registryService - レジストリサービス
 * @returns クローンが実行されたかどうか
 */
export async function ensureRepositoryCloned(
  repo: Repository,
  registryService: RegistryService
): Promise<boolean> {
  // リポジトリが既に存在する場合は何もしない
  if (repo.localPath && await isGitRepository(repo.localPath)) {
    return false;
  }

  // リポジトリをクローン
  const repoDir = repo.localPath || path.join(REPOS_DIR, repo.name.replace('/', '-'));
  
  // localPathを設定
  repo.localPath = repoDir;
  
  // ディレクトリを作成
  await ensureDir(path.dirname(repoDir));
  
  const gitManager = new GitManager();
  await gitManager.clone(repo);
  
  // データベースのlocalPathを更新
  await registryService.update(repo.id, { localPath: repoDir });
  
  return true;
}

/**
 * Git更新結果の型
 */
export interface GitUpdateResult {
  filesChanged: number;
  insertions: number;
  deletions: number;
  currentCommit: string;
  previousCommit: string;
}

/**
 * リポジトリをクローンした場合のダミー更新結果を生成
 * @param repo - リポジトリ
 * @returns Git更新結果
 */
export async function createCloneResult(repo: Repository): Promise<GitUpdateResult> {
  const gitManager = new GitManager();
  return {
    filesChanged: 0,
    insertions: 0,
    deletions: 0,
    currentCommit: await gitManager.getLatestCommit(repo),
    previousCommit: ''
  };
}