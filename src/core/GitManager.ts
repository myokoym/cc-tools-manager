import simpleGit, { SimpleGit, GitError } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';
import { 
  IGitManager, 
  GitUpdateResult, 
  GitStatus 
} from './interfaces/IGitManager';
import { Repository } from '../types';
import { REPOS_DIR } from '../constants/paths';
import { createError } from '../utils/errors';
import { Logger } from '../utils/logger';

/**
 * GitManager
 * 
 * simple-gitを使用したGit操作の実装
 * リポジトリのクローン、更新、ステータス確認などの機能を提供
 */
export class GitManager implements IGitManager {
  private git: SimpleGit;
  private logger: Logger;

  constructor(baseDir?: string, logger?: Logger) {
    // baseDirが指定されない場合はREPOS_DIRを使用
    const dir = baseDir || REPOS_DIR;
    
    // ディレクトリが存在しない場合は作成
    if (!require('fs').existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    
    this.git = simpleGit({
      baseDir: dir,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
    });
    this.logger = logger || new Logger();
  }

  /**
   * リポジトリをクローンする
   */
  async clone(repo: Repository): Promise<void> {
    this.logger.info(`Cloning ${repo.name}...`);
    const repoPath = this.getRepoPath(repo);

    try {
      // ディレクトリが既に存在するか確認
      try {
        await fs.access(repoPath);
        this.logger.warn(`Repository ${repo.name} already exists at ${repoPath}`);
        return;
      } catch {
        // ディレクトリが存在しない場合は続行
      }

      // 親ディレクトリを作成
      await fs.mkdir(path.dirname(repoPath), { recursive: true });

      // クローン実行
      // simple-gitのクローンには親ディレクトリを指定
      const parentDir = path.dirname(repoPath);
      const repoName = path.basename(repoPath);
      const gitForClone = simpleGit(parentDir);
      
      await gitForClone.clone(repo.url, repoName, {
        '--progress': null,
        '--depth': '1', // 履歴を最小限に
      });

      this.logger.info(`Successfully cloned ${repo.name} to ${repoPath}`);
    } catch (error) {
      this.logger.error(`Failed to clone ${repo.name}`, error);
      
      if (this.isGitError(error)) {
        // Git認証エラーの判定
        if (error.message.includes('Authentication') || 
            error.message.includes('could not read Username') ||
            error.message.includes('Permission denied')) {
          throw createError(
            'GIT_AUTH_ERROR',
            `Authentication failed for repository ${repo.name}. Please check your credentials.`
          );
        }
        
        throw createError(
          'GIT_CLONE_ERROR',
          `Failed to clone repository ${repo.name}: ${error.message}`
        );
      }
      
      throw error;
    }
  }

  /**
   * リポジトリを更新する（git pull）
   */
  async pull(repo: Repository): Promise<GitUpdateResult> {
    this.logger.info(`Updating ${repo.name}...`);
    const repoPath = this.getRepoPath(repo);
    const repoGit = simpleGit(repoPath);

    try {
      // リポジトリの存在確認
      await this.verifyRepoExists(repoPath);

      // 現在のコミットハッシュを取得
      const previousCommit = await repoGit.revparse(['HEAD']);

      // Pull実行
      const pullResult = await repoGit.pull();

      // 新しいコミットハッシュを取得
      const currentCommit = await repoGit.revparse(['HEAD']);

      // 変更統計を取得
      let filesChanged = 0;
      let insertions = 0;
      let deletions = 0;

      if (previousCommit !== currentCommit) {
        const diffStat = await repoGit.diffSummary([previousCommit, currentCommit]);
        filesChanged = diffStat.files.length;
        insertions = diffStat.insertions;
        deletions = diffStat.deletions;
      }

      this.logger.info(`Successfully updated ${repo.name} (${filesChanged} files changed)`);

      return {
        filesChanged,
        insertions,
        deletions,
        currentCommit: currentCommit.trim(),
        previousCommit: previousCommit.trim(),
      };
    } catch (error) {
      this.logger.error(`Failed to update ${repo.name}`, error);
      
      if (this.isGitError(error)) {
        throw createError(
          'GIT_PULL_ERROR',
          `Failed to pull repository ${repo.name}: ${error.message}`
        );
      }
      
      throw error;
    }
  }

  /**
   * リポジトリのステータスを取得する
   */
  async getStatus(repo: Repository): Promise<GitStatus> {
    const repoPath = this.getRepoPath(repo);
    const repoGit = simpleGit(repoPath);

    try {
      await this.verifyRepoExists(repoPath);

      const status = await repoGit.status();
      const branch = await repoGit.branch();

      return {
        isClean: status.isClean(),
        branch: branch.current,
        ahead: status.ahead,
        behind: status.behind,
        modified: status.modified,
        untracked: status.not_added,
      };
    } catch (error) {
      if (this.isGitError(error)) {
        throw createError(
          'GIT_STATUS_ERROR',
          `Failed to get status for repository ${repo.name}: ${error.message}`
        );
      }
      
      throw error;
    }
  }

  /**
   * 最新のコミットSHAを取得する
   */
  async getLatestCommit(repo: Repository): Promise<string> {
    const repoPath = this.getRepoPath(repo);
    const repoGit = simpleGit(repoPath);

    try {
      await this.verifyRepoExists(repoPath);
      const commit = await repoGit.revparse(['HEAD']);
      return commit.trim();
    } catch (error) {
      if (this.isGitError(error)) {
        throw createError(
          'GIT_COMMIT_ERROR',
          `Failed to get latest commit for repository ${repo.name}: ${error.message}`
        );
      }
      
      throw error;
    }
  }

  /**
   * リポジトリの作業ディレクトリがクリーンか確認する
   */
  async isRepoClean(repo: Repository): Promise<boolean> {
    const repoPath = this.getRepoPath(repo);
    const repoGit = simpleGit(repoPath);

    try {
      await this.verifyRepoExists(repoPath);
      const status = await repoGit.status();
      return status.isClean();
    } catch (error) {
      if (this.isGitError(error)) {
        this.logger.warn(`Failed to check if repository ${repo.name} is clean: ${error.message}`);
        return false;
      }
      
      throw error;
    }
  }

  /**
   * リポジトリのローカルパスを取得する
   */
  private getRepoPath(repo: Repository): string {
    if (repo.localPath) {
      return repo.localPath;
    }
    
    // URLからリポジトリ名を抽出
    const repoName = this.extractRepoName(repo.url);
    return path.join(REPOS_DIR, repoName);
  }

  /**
   * URLからリポジトリ名を抽出する
   */
  private extractRepoName(url: string): string {
    // GitHub URLパターン: https://github.com/user/repo.git
    const match = url.match(/(?:git@github\.com:|https:\/\/github\.com\/)([^\/]+)\/([^\.]+)(?:\.git)?$/);
    
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
    
    // その他のURLの場合は最後のパス部分を使用
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/\.git$/, '');
  }

  /**
   * リポジトリが存在することを確認する
   */
  private async verifyRepoExists(repoPath: string): Promise<void> {
    try {
      await fs.access(repoPath);
      const gitDir = path.join(repoPath, '.git');
      await fs.access(gitDir);
    } catch {
      throw createError(
        'REPO_NOT_FOUND',
        `Repository not found at ${repoPath}. Please clone it first.`
      );
    }
  }

  /**
   * エラーがGitErrorかどうかを判定する
   */
  private isGitError(error: unknown): error is GitError {
    return error instanceof Error && 'task' in error;
  }
}