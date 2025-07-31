/**
 * RepositoryStatusService
 * リポジトリのステータス情報管理
 */

import { Repository, RepositoryStatus } from '../types/repository';
import { promises as fs } from 'fs';
import { fileExists, getAllFiles } from '../utils/file-system';

export interface LocalRepositoryInfo {
  exists: boolean;
  path?: string;
  currentBranch?: string;
  lastCommit?: string;
  commitMessage?: string;
  isDirty?: boolean;
  diskSize?: number;
  fileCount?: number;
}

export interface DeploymentStatusInfo {
  totalDeployedFiles: number;
  lastDeploymentTime?: string;
  deploymentErrors: string[];
  activeDeployments: {
    commands: number;
    agents: number;
    hooks: number;
  };
}

export interface RepositoryStatusInfo {
  repository: Repository;
  local: LocalRepositoryInfo;
  deployment: DeploymentStatusInfo;
  health: {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    lastChecked: string;
  };
}

export interface DeploymentStats {
  totalFiles: number;
  byType: {
    commands: number;
    agents: number;
    hooks: number;
  };
  lastDeployment?: string;
}

export interface ConflictInfo {
  hasConflicts: boolean;
  conflicts: Array<{
    type: 'modified' | 'untracked' | 'deleted';
    file: string;
    description: string;
  }>;
}

export interface CloneVerificationResult {
  isValid: boolean;
  issues: string[];
}

export type SyncStatus = 'up-to-date' | 'behind' | 'ahead' | 'diverged';

/**
 * リポジトリのステータス情報を管理するサービス
 */
export class RepositoryStatusService {
  private gitManager?: any;
  private stateManager?: any;

  constructor(
    gitManager?: any,
    stateManager?: any
  ) {
    this.gitManager = gitManager;
    this.stateManager = stateManager;
  }

  /**
   * Set the GitManager instance (for testing)
   */
  setGitManager(gitManager: any): void {
    this.gitManager = gitManager;
  }

  /**
   * Set the StateManager instance (for testing)
   */
  setStateManager(stateManager: any): void {
    this.stateManager = stateManager;
  }

  /**
   * リポジトリの完全なステータス情報を取得
   */
  async getRepositoryStatus(repository: Repository): Promise<RepositoryStatusInfo> {
    try {
      // 基本的な検証
      if (!repository || !repository.id) {
        return {
          repository,
          local: { exists: false },
          deployment: {
            totalDeployedFiles: 0,
            deploymentErrors: [],
            activeDeployments: { commands: 0, agents: 0, hooks: 0 }
          },
          health: { status: 'error', issues: ['Invalid repository object'], lastChecked: new Date().toISOString() }
        };
      }

      const [localInfo, deploymentInfo] = await Promise.all([
        this.getLocalInfo(repository),
        this.getDeploymentStatus(repository)
      ]);

      const healthCheck = await this.performHealthCheck(repository);

      return {
        repository,
        local: localInfo,
        deployment: deploymentInfo,
        health: {
          status: healthCheck.status,
          issues: healthCheck.issues,
          lastChecked: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        repository,
        local: { exists: false },
        deployment: {
          totalDeployedFiles: 0,
          deploymentErrors: [],
          activeDeployments: { commands: 0, agents: 0, hooks: 0 }
        },
        health: {
          status: 'error',
          issues: ['Failed to get repository status'],
          lastChecked: new Date().toISOString()
        }
      };
    }
  }

  /**
   * ローカルリポジトリの情報を取得
   */
  async getLocalInfo(repository: Repository): Promise<LocalRepositoryInfo> {
    try {
      if (!repository.localPath) {
        return { exists: false };
      }

      // ディレクトリ存在確認
      
      const exists = await fileExists(repository.localPath);
      if (!exists) {
        return { exists: false };
      }

      const result: LocalRepositoryInfo = {
        exists: true,
        path: repository.localPath
      };

      try {
        // ファイル数とディスクサイズ計算
        const allFiles = await getAllFiles(repository.localPath);
        result.fileCount = allFiles.length;
        
        // ディスクサイズ計算（簡単な実装）
        let totalSize = 0;
        for (const file of allFiles) {
          try {
            const stats = await fs.stat(file);
            totalSize += stats.size;
          } catch {
            // ファイルアクセスエラーは無視
          }
        }
        result.diskSize = totalSize;
      } catch {
        // ファイルシステムエラーは無視してcontinue
      }

      // Git情報の取得
      try {
        await fs.access(`${repository.localPath}/.git`);
        
        if (this.gitManager) {
          const gitStatus = await this.gitManager.getStatus(repository);
          const latestCommit = await this.gitManager.getLatestCommit(repository);
          
          result.currentBranch = gitStatus.branch;
          result.lastCommit = latestCommit;
          result.isDirty = !gitStatus.isClean;
          result.commitMessage = 'Latest commit'; // Simple placeholder
        }
      } catch {
        // Git情報が取得できない場合はundefinedのまま
      }

      return result;
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * デプロイメントステータス情報を取得
   */
  async getDeploymentStatus(repository: Repository): Promise<DeploymentStatusInfo> {
    try {
      if (!this.stateManager) {
        return {
          totalDeployedFiles: 0,
          deploymentErrors: [],
          activeDeployments: { commands: 0, agents: 0, hooks: 0 }
        };
      }

      const repoState = await this.stateManager.getRepositoryState(repository.id);
      if (!repoState) {
        return {
          totalDeployedFiles: 0,
          deploymentErrors: [],
          activeDeployments: { commands: 0, agents: 0, hooks: 0 }
        };
      }

      const deployedFiles = repoState.deployedFiles || [];
      const errors = repoState.errors || [];

      // ファイルタイプ別の集計
      const activeDeployments = {
        commands: deployedFiles.filter((f: any) => f.target.includes('commands/')).length,
        agents: deployedFiles.filter((f: any) => f.target.includes('agents/')).length,
        hooks: deployedFiles.filter((f: any) => f.target.includes('hooks/')).length
      };

      // 最後のデプロイメント時刻
      const lastDeploymentTime = deployedFiles.length > 0
        ? deployedFiles.reduce((latest: string, file: any) => 
            file.deployedAt > latest ? file.deployedAt : latest, 
            deployedFiles[0].deployedAt
          )
        : undefined;

      return {
        totalDeployedFiles: deployedFiles.length,
        lastDeploymentTime,
        deploymentErrors: errors,
        activeDeployments
      };
    } catch (error) {
      return {
        totalDeployedFiles: 0,
        deploymentErrors: [],
        activeDeployments: { commands: 0, agents: 0, hooks: 0 }
      };
    }
  }

  /**
   * リポジトリのヘルスチェックを実行
   */
  async performHealthCheck(repository: Repository): Promise<{
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // ローカルリポジトリの存在確認
      if (!repository.localPath) {
        issues.push('Local repository path not configured');
        suggestions.push('Configure local path for repository');
      } else {
        
        const exists = await fileExists(repository.localPath);
        if (!exists) {
          issues.push('Local repository not found');
          suggestions.push('Run clone command to create local copy');
        } else {
          // .gitディレクトリの確認
          try {
            await fs.access(`${repository.localPath}/.git`);
          } catch {
            issues.push('Git repository is corrupted or invalid');
            suggestions.push('Re-clone the repository');
          }
        }
      }

      // Git状態チェック
      if (this.gitManager && repository.localPath) {
        try {
          const gitStatus = await this.gitManager.getStatus(repository);
          
          if (!gitStatus.isClean) {
            issues.push('Working directory has uncommitted changes');
            suggestions.push('Commit or stash local changes');
          }
          
          if (gitStatus.behind > 0) {
            issues.push(`Repository is behind remote by ${gitStatus.behind} commits`);
            suggestions.push('Run update command to sync with remote');
          }
        } catch {
          issues.push('Git status check failed');
          suggestions.push('Check repository integrity');
        }
      }

      // デプロイメント状態チェック
      if (this.stateManager) {
        try {
          const repoState = await this.stateManager.getRepositoryState(repository.id);
          if (repoState && repoState.errors && repoState.errors.length > 0) {
            issues.push('Deployment errors detected');
            suggestions.push('Check deployment configuration and permissions');
            
            // 個別のエラーも追加
            repoState.errors.forEach((error: string) => {
              issues.push(error);
            });
          }

          // デプロイされたファイルの存在確認
          if (repoState && repoState.deployedFiles) {
            let missingFiles = 0;
            
            for (const deployedFile of repoState.deployedFiles) {
              try {
                const exists = await fileExists(deployedFile.target);
                if (!exists) {
                  missingFiles++;
                }
              } catch {
                missingFiles++;
              }
            }
            
            if (missingFiles > 0) {
              issues.push('Some deployed files are missing');
              suggestions.push('Re-deploy the repository');
            }
          }
        } catch {
          // StateManagerエラーは警告レベル
        }
      }

      // ヘルスステータスの決定
      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      
      if (issues.some(issue => 
        issue.includes('not found') || 
        issue.includes('corrupted') || 
        issue.includes('invalid') ||
        issue.includes('Deployment errors detected')
      )) {
        status = 'error';
      } else if (issues.length > 0) {
        status = 'warning';
      }

      return { status, issues, suggestions };
    } catch (error) {
      return {
        status: 'error',
        issues: ['Health check failed'],
        suggestions: ['Check repository configuration']
      };
    }
  }

  /**
   * ステータスを更新
   * TODO: 実装
   * - 新しいステータスの設定
   * - 変更履歴の記録
   * - 通知処理
   */
  async updateStatus(
    repository: Repository, 
    newStatus: RepositoryStatus,
    reason?: string
  ): Promise<void> {
    // プレースホルダー実装
    // RegistryServiceとの連携が必要
  }

  /**
   * Git同期ステータスをチェック
   */
  async checkSyncStatus(repository: Repository): Promise<SyncStatus> {
    try {
      if (!this.gitManager) {
        return 'up-to-date';
      }

      const gitStatus = await this.gitManager.getStatus(repository);
      
      if (gitStatus.ahead > 0 && gitStatus.behind > 0) {
        return 'diverged';
      } else if (gitStatus.ahead > 0) {
        return 'ahead';
      } else if (gitStatus.behind > 0) {
        return 'behind';
      } else {
        return 'up-to-date';
      }
    } catch (error) {
      return 'up-to-date';
    }
  }

  /**
   * デプロイメント統計を取得
   */
  async getDeploymentStats(repository: Repository): Promise<DeploymentStats> {
    try {
      if (!this.stateManager) {
        return {
          totalFiles: 0,
          byType: { commands: 0, agents: 0, hooks: 0 }
        };
      }

      const repoState = await this.stateManager.getRepositoryState(repository.id);
      if (!repoState || !repoState.deployedFiles) {
        return {
          totalFiles: 0,
          byType: { commands: 0, agents: 0, hooks: 0 }
        };
      }

      const deployedFiles = repoState.deployedFiles;
      
      const byType = {
        commands: deployedFiles.filter((f: any) => f.target.includes('commands/')).length,
        agents: deployedFiles.filter((f: any) => f.target.includes('agents/')).length,
        hooks: deployedFiles.filter((f: any) => f.target.includes('hooks/')).length
      };

      const lastDeployment = deployedFiles.length > 0
        ? deployedFiles.reduce((latest: string, file: any) => 
            file.deployedAt > latest ? file.deployedAt : latest, 
            deployedFiles[0].deployedAt
          )
        : undefined;

      return {
        totalFiles: deployedFiles.length,
        byType,
        lastDeployment
      };
    } catch (error) {
      return {
        totalFiles: 0,
        byType: { commands: 0, agents: 0, hooks: 0 }
      };
    }
  }

  /**
   * 競合状態を検出
   */
  async detectConflicts(repository: Repository): Promise<ConflictInfo> {
    try {
      if (!this.gitManager) {
        return { hasConflicts: false, conflicts: [] };
      }

      const gitStatus = await this.gitManager.getStatus(repository);
      const conflicts = [];

      // 変更されたファイル
      for (const file of gitStatus.modified) {
        conflicts.push({
          type: 'modified' as const,
          file,
          description: 'File has been modified locally'
        });
      }

      // 未追跡ファイル
      for (const file of gitStatus.untracked) {
        conflicts.push({
          type: 'untracked' as const,
          file,
          description: 'Untracked file present'
        });
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts
      };
    } catch (error) {
      return { hasConflicts: false, conflicts: [] };
    }
  }

  /**
   * ローカルクローンの妥当性を検証
   */
  async verifyLocalClone(repository: Repository): Promise<CloneVerificationResult> {
    const issues: string[] = [];

    try {
      if (!repository.localPath) {
        issues.push('Repository directory does not exist');
        return { isValid: false, issues };
      }

      
      // ディレクトリ存在確認
      const exists = await fileExists(repository.localPath);
      if (!exists) {
        issues.push('Repository directory does not exist');
        return { isValid: false, issues };
      }

      // .gitディレクトリの確認
      try {
        await fs.access(`${repository.localPath}/.git`);
      } catch {
        issues.push('Not a valid git repository (.git directory missing)');
        return { isValid: false, issues };
      }

      return { isValid: true, issues: [] };
    } catch (error) {
      issues.push('Repository directory does not exist');
      return { isValid: false, issues };
    }
  }
}