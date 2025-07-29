import * as path from 'path';
import { IStateManager, RepositoryState, RepositoryUpdate } from './interfaces/IStateManager';
import { Repository } from '../types';
import { GitUpdateResult } from './interfaces/IGitManager';
import { DeploymentResult } from './interfaces/IDeploymentService';
import { CC_TOOLS_HOME } from '../constants/paths';
import {
  ensureDir,
  fileExists,
  readJsonFile,
  writeJsonFile,
  getFileHash,
  createTempFile,
  moveFile,
  remove
} from '../utils/file-system';

interface AppState {
  version: string;
  repositories: { [key: string]: RepositoryState };
  metadata: {
    lastCleanup: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

export class StateManager implements IStateManager {
  private readonly stateFilePath: string;
  private state: AppState | null = null;
  private readonly lockFilePath: string;

  constructor(stateFile?: string) {
    this.stateFilePath = stateFile || path.join(CC_TOOLS_HOME, 'state.json');
    this.lockFilePath = `${this.stateFilePath}.lock`;
  }

  /**
   * 状態ファイルを初期化
   */
  private async initializeState(): Promise<AppState> {
    const now = new Date().toISOString();
    return {
      version: '1.0.0',
      repositories: {},
      metadata: {
        lastCleanup: null,
        createdAt: now,
        updatedAt: now
      }
    };
  }

  /**
   * 状態ファイルを読み込む
   */
  private async loadState(): Promise<AppState> {
    if (this.state) {
      return this.state;
    }

    if (await fileExists(this.stateFilePath)) {
      try {
        this.state = await readJsonFile<AppState>(this.stateFilePath);
        return this.state;
      } catch (error) {
        // 破損している場合は初期化
        console.error('State file is corrupted, initializing new state');
        this.state = await this.initializeState();
        await this.saveState();
        return this.state;
      }
    } else {
      // ファイルが存在しない場合は初期化
      await ensureDir(path.dirname(this.stateFilePath));
      this.state = await this.initializeState();
      await this.saveState();
      return this.state;
    }
  }

  /**
   * 状態ファイルをアトミックに保存
   */
  private async saveState(): Promise<void> {
    if (!this.state) {
      throw new Error('State is not loaded');
    }

    // メタデータの更新
    this.state.metadata.updatedAt = new Date().toISOString();

    // ロックファイルをチェック
    let lockRetries = 0;
    while (await fileExists(this.lockFilePath)) {
      if (lockRetries++ > 10) {
        throw new Error('Unable to acquire lock for state file');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      // ロックファイルを作成
      await writeJsonFile(this.lockFilePath, { pid: process.pid, timestamp: Date.now() });

      // テンポラリファイルに書き込み
      const tempFile = await createTempFile('state', '.json');
      await writeJsonFile(tempFile, this.state, 2);

      // アトミックに置き換え
      await moveFile(tempFile, this.stateFilePath);
    } finally {
      // ロックファイルを削除
      await remove(this.lockFilePath);
    }
  }

  /**
   * デプロイされたファイルのハッシュを計算
   */
  private async calculateDeployedFileHashes(
    deploymentResult: DeploymentResult
  ): Promise<Array<{ source: string; target: string; hash: string; deployedAt: string }>> {
    const deployedFiles = [];
    const deployedAt = new Date().toISOString();

    for (const filename of deploymentResult.deployed) { // TODO: Update interface to use deployed instead of deployedFiles
      try {
        // For now, we'll use the filename as both source and target
        // TODO: Update DeploymentResult to include source/target mapping
        const hash = await getFileHash(filename);
        deployedFiles.push({
          source: filename,
          target: filename,
          hash,
          deployedAt
        });
      } catch (error) {
        console.error(`Failed to calculate hash for ${filename}:`, error);
        // ハッシュ計算に失敗してもデプロイメント情報は記録
        deployedFiles.push({
          source: filename,
          target: filename,
          hash: 'unknown',
          deployedAt
        });
      }
    }

    return deployedFiles;
  }

  async updateRepositoryState(
    repo: Repository,
    updateResult: GitUpdateResult,
    deploymentResult: DeploymentResult
  ): Promise<void> {
    const state = await this.loadState();
    
    const deployedFiles = await this.calculateDeployedFileHashes(deploymentResult);
    
    state.repositories[repo.id] = {
      lastSync: new Date().toISOString(),
      lastCommit: updateResult.currentCommit, // TODO: Update interface to use currentCommit
      deployedFiles,
      errors: deploymentResult.failed // TODO: Update interface to use failed instead of errors
    };

    await this.saveState();
  }

  async getRepositoryState(repoId: string): Promise<RepositoryState | null> {
    const state = await this.loadState();
    return state.repositories[repoId] || null;
  }

  async checkForUpdates(): Promise<RepositoryUpdate[]> {
    // この実装では更新チェック機能は提供しない
    // GitManagerとの連携が必要なため、実際の実装は上位レイヤーで行う
    return [];
  }

  async getTotalDeployedFiles(): Promise<number> {
    const state = await this.loadState();
    let total = 0;

    for (const repoState of Object.values(state.repositories)) {
      total += repoState.deployedFiles.length;
    }

    return total;
  }

  async getLastCleanupDate(): Promise<string | null> {
    const state = await this.loadState();
    return state.metadata.lastCleanup;
  }

  async updateCleanupDate(): Promise<void> {
    const state = await this.loadState();
    state.metadata.lastCleanup = new Date().toISOString();
    await this.saveState();
  }

  /**
   * 孤立ファイルを検出する
   * デプロイ先に存在するが、現在の状態に記録されていないファイル
   */
  async detectOrphanedFiles(deploymentPath: string): Promise<string[]> {
    const state = await this.loadState();
    const trackedFiles = new Set<string>();

    // すべての追跡されているファイルを収集
    for (const repoState of Object.values(state.repositories)) {
      for (const file of repoState.deployedFiles) {
        trackedFiles.add(file.target);
      }
    }

    // デプロイメントパス内のすべてのファイルを取得
    const { getAllFiles } = await import('../utils/file-system');
    const allFiles = await getAllFiles(deploymentPath);

    // 追跡されていないファイルを検出
    const orphanedFiles = allFiles.filter(file => !trackedFiles.has(file));

    return orphanedFiles;
  }

  /**
   * 特定のリポジトリの状態をリセット
   */
  async resetRepositoryState(repoId: string): Promise<void> {
    const state = await this.loadState();
    delete state.repositories[repoId];
    await this.saveState();
  }

  /**
   * すべての状態をリセット
   */
  async resetAllState(): Promise<void> {
    this.state = await this.initializeState();
    await this.saveState();
  }
}