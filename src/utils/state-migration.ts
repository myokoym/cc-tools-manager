/**
 * State Migration Utilities
 * 
 * 状態ファイルのバージョン間マイグレーション機能を提供
 * V1からV2フォーマットへの変換とバックアップ機能
 */

import * as path from 'path';
import { DeploymentState, EnhancedAppState, StateVersion, InstallationRecord } from '../types/state';
import { fileExists, readJsonFile, writeJsonFile, createTempFile, moveFile, copyFile } from './file-system';
import { logger } from './logger';

// V1フォーマットの型定義（後方互換性のため）
interface V1RepositoryState {
  lastSync: string;
  lastCommit: string;
  deployedFiles: Array<{
    source: string;
    target: string;
    hash: string;
    deployedAt: string;
  }>;
  errors?: string[];
}

interface V1AppState {
  version: string;
  repositories: { [key: string]: V1RepositoryState };
  metadata: {
    lastCleanup: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

// マイグレーション結果
export interface MigrationResult {
  success: boolean;
  message: string;
  fromVersion: string;
  toVersion: string;
  backupPath?: string;
  errors?: string[];
  statistics?: {
    repositoriesMigrated: number;
    filesMigrated: number;
    recordsCreated: number;
  };
}

// マイグレーションオプション
export interface MigrationOptions {
  createBackup?: boolean;
  backupPath?: string;
  force?: boolean;
  validateAfter?: boolean;
}

/**
 * 状態ファイルのバージョンを検出する
 */
export async function detectStateVersion(stateFilePath: string): Promise<StateVersion> {
  if (!await fileExists(stateFilePath)) {
    return {
      version: '2.0.0',
      format: 'v2',
      migrationRequired: false
    };
  }

  try {
    const state = await readJsonFile<any>(stateFilePath);
    
    // V2フォーマットの判定
    if (state.version && typeof state.version === 'object' && state.version.format) {
      return state.version as StateVersion;
    }
    
    // V1フォーマットの判定
    if (state.version && typeof state.version === 'string') {
      return {
        version: state.version,
        format: 'v1',
        migrationRequired: true
      };
    }
    
    // 不明なフォーマット
    return {
      version: 'unknown',
      format: 'v1',
      migrationRequired: true
    };
  } catch (error) {
    logger.error('Failed to detect state version:', error);
    throw new Error(`Failed to detect state version: ${error}`);
  }
}

/**
 * 状態ファイルをバックアップする
 */
export async function backupStateFile(
  stateFilePath: string, 
  backupPath?: string
): Promise<string> {
  if (!await fileExists(stateFilePath)) {
    throw new Error('State file does not exist');
  }

  if (!backupPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.dirname(stateFilePath);
    const basename = path.basename(stateFilePath, '.json');
    backupPath = path.join(dir, `${basename}.backup.${timestamp}.json`);
  }

  try {
    await copyFile(stateFilePath, backupPath);
    logger.info(`State backed up to: ${backupPath}`);
    return backupPath;
  } catch (error) {
    logger.error('Failed to backup state file:', error);
    throw new Error(`Failed to backup state file: ${error}`);
  }
}

/**
 * V1からV2フォーマットにマイグレーションする
 */
export async function migrateV1ToV2(
  stateFilePath: string,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const startTime = Date.now();
  logger.info('Starting V1 to V2 state migration');

  try {
    // バージョン検出
    const currentVersion = await detectStateVersion(stateFilePath);
    if (currentVersion.format === 'v2') {
      return {
        success: true,
        message: 'State is already in V2 format',
        fromVersion: currentVersion.version,
        toVersion: '2.0.0'
      };
    }

    if (currentVersion.format !== 'v1') {
      return {
        success: false,
        message: `Unsupported state format: ${currentVersion.format}`,
        fromVersion: currentVersion.version,
        toVersion: '2.0.0',
        errors: [`Cannot migrate from ${currentVersion.format} format`]
      };
    }

    // バックアップ作成
    let backupPath: string | undefined;
    if (options.createBackup !== false) {
      backupPath = await backupStateFile(stateFilePath, options.backupPath);
    }

    // V1状態を読み込み
    const v1State = await readJsonFile<V1AppState>(stateFilePath);
    
    // V2状態に変換 - StateFileV2 format
    const v2State: any = {
      version: 2,
      repositories: v1State.repositories || [],
      deploymentStates: {},
      installationHistory: [],
      metadata: {
        lastUpdated: new Date().toISOString(),
        lastMigration: new Date().toISOString()
      }
    };

    // 統計用カウンター
    let repositoriesMigrated = 0;
    let filesMigrated = 0;
    let recordsCreated = 0;

    // リポジトリごとに変換
    for (const [repoId, v1RepoState] of Object.entries(v1State.repositories)) {
      // インストール記録を生成
      const installationRecord: InstallationRecord = {
        id: `migration-${repoId}-${Date.now()}`,
        repositoryId: repoId,
        operation: 'install',
        timestamp: v1RepoState.lastSync,
        filesAffected: v1RepoState.deployedFiles.length,
        success: (v1RepoState.errors?.length || 0) === 0,
        error: v1RepoState.errors?.join('; '),
        metadata: {
          commitHash: v1RepoState.lastCommit,
          userAgent: 'migration-v1-to-v2'
        }
      };

      // V2デプロイメント状態を作成
      const deploymentState: DeploymentState = {
        repositoryId: repoId,
        lastInstalled: v1RepoState.lastSync,
        deployedFiles: v1RepoState.deployedFiles.map(file => ({
          path: file.target, // Use target as the deployed path
          hash: file.hash,
          deployedAt: file.deployedAt,
          source: file.source,
          target: file.target,
          type: undefined
        })),
        installationStatus: (v1RepoState.errors?.length || 0) > 0 ? 'error' : 'installed',
        errors: v1RepoState.errors,
        metadata: {
          totalInstallations: 1,
          totalUninstallations: 0,
          firstInstalled: v1RepoState.lastSync,
          lastCommitHash: v1RepoState.lastCommit
        }
      };

      v2State.deploymentStates[repoId] = deploymentState;
      v2State.installationHistory.push(installationRecord);
      
      repositoriesMigrated++;
      filesMigrated += v1RepoState.deployedFiles.length;
      recordsCreated++;
    }

    // メタデータを更新
    v2State.metadata.lastUpdated = new Date().toISOString();

    // アトミックに保存
    const tempFile = await createTempFile('state-migration', '.json');
    await writeJsonFile(tempFile, v2State, 2);
    await moveFile(tempFile, stateFilePath);

    // 検証（オプション）
    if (options.validateAfter !== false) {
      await validateMigratedState(stateFilePath);
    }

    const duration = Date.now() - startTime;
    const message = `Migration completed successfully in ${duration}ms`;
    
    logger.info(message, {
      repositoriesMigrated,
      filesMigrated,
      recordsCreated,
      backupPath
    });

    return {
      success: true,
      message,
      fromVersion: currentVersion.version,
      toVersion: '2.0.0',
      backupPath,
      statistics: {
        repositoriesMigrated,
        filesMigrated,
        recordsCreated
      }
    };

  } catch (error) {
    const errorMessage = `Migration failed: ${error}`;
    logger.error(errorMessage, error);
    
    return {
      success: false,
      message: errorMessage,
      fromVersion: 'unknown',
      toVersion: '2.0.0',
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * マイグレーション後の状態を検証する
 */
async function validateMigratedState(stateFilePath: string): Promise<void> {
  try {
    const state = await readJsonFile<any>(stateFilePath);
    
    // 基本構造の検証 - Accept both v2 formats
    const isSimpleV2 = state.version === 2;
    const isComplexV2 = state.version && typeof state.version === 'object' && state.version.format === 'v2';
    
    if (!isSimpleV2 && !isComplexV2) {
      throw new Error('Invalid V2 state format');
    }
    
    // For StateFileV2 format
    if (isSimpleV2) {
      if (!Array.isArray(state.repositories)) {
        throw new Error('Invalid repositories structure - expected array');
      }
      
      if (!state.deploymentStates || typeof state.deploymentStates !== 'object') {
        throw new Error('Invalid deploymentStates structure');
      }
      
      if (!Array.isArray(state.installationHistory)) {
        throw new Error('Invalid installationHistory structure - expected array');
      }
      
      if (!state.metadata || typeof state.metadata !== 'object') {
        throw new Error('Invalid metadata structure');
      }
      
      // Skip repository validation for simple v2 format
      return;
    }
    
    // For EnhancedAppState format (complex v2)
    if (!state.repositories || typeof state.repositories !== 'object') {
      throw new Error('Invalid repositories structure');
    }
    
    if (!state.metadata || typeof state.metadata !== 'object') {
      throw new Error('Invalid metadata structure');
    }
    
    // リポジトリごとの検証
    for (const [repoId, deploymentState] of Object.entries(state.repositories)) {
      const deployment = deploymentState as any;
      if (!deployment.repositoryId) {
        throw new Error(`Repository ${repoId} missing repositoryId`);
      }
      
      if (!deployment.installationStatus) {
        throw new Error(`Repository ${repoId} missing installationStatus`);
      }
      
      if (!Array.isArray(deployment.deployedFiles)) {
        throw new Error(`Repository ${repoId} has invalid deployedFiles`);
      }
      
      // installationRecords are now stored separately in installationHistory
    }
    
    logger.info('Migration validation passed');
  } catch (error) {
    logger.error('Migration validation failed:', error);
    throw error;
  }
}

/**
 * 自動マイグレーション実行
 */
export async function autoMigrate(
  stateFilePath: string,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const version = await detectStateVersion(stateFilePath);
  
  if (!version.migrationRequired) {
    return {
      success: true,
      message: 'No migration required',
      fromVersion: version.version,
      toVersion: version.version
    };
  }
  
  switch (version.format) {
    case 'v1':
      return await migrateV1ToV2(stateFilePath, options);
    
    default:
      return {
        success: false,
        message: `Unsupported migration from ${version.format}`,
        fromVersion: version.version,
        toVersion: '2.0.0',
        errors: [`No migration path available for ${version.format}`]
      };
  }
}

/**
 * バックアップから状態を復元する
 */
export async function restoreFromBackup(
  stateFilePath: string,
  backupPath: string,
  verify: boolean = true
): Promise<void> {
  if (!await fileExists(backupPath)) {
    throw new Error('Backup file does not exist');
  }
  
  if (verify) {
    // バックアップファイルの検証
    try {
      await readJsonFile(backupPath);
    } catch (error) {
      throw new Error(`Invalid backup file: ${error}`);
    }
  }
  
  try {
    await copyFile(backupPath, stateFilePath);
    logger.info(`State restored from backup: ${backupPath}`);
  } catch (error) {
    logger.error('Failed to restore from backup:', error);
    throw new Error(`Failed to restore from backup: ${error}`);
  }
}

/**
 * StateMigration wrapper for compatibility
 */
export const stateMigration = {
  async checkAndMigrate(stateFilePath: string): Promise<{
    migrated: boolean;
    state: any;
    backupPath: string | null;
  }> {
    const version = await detectStateVersion(stateFilePath);
    
    if (!version.migrationRequired) {
      // Check if file exists before reading
      if (!await fileExists(stateFilePath)) {
        // Return empty v2 state structure
        return {
          migrated: false,
          state: {
            version: 2,
            repositories: [],
            deploymentStates: {},
            installationHistory: [],
            metadata: {
              lastUpdated: new Date().toISOString(),
              lastMigration: null
            }
          },
          backupPath: null
        };
      }
      
      const state = await readJsonFile(stateFilePath);
      return {
        migrated: false,
        state,
        backupPath: null
      };
    }
    
    const result = await autoMigrate(stateFilePath);
    
    if (result.success) {
      const state = await readJsonFile(stateFilePath);
      return {
        migrated: true,
        state,
        backupPath: result.backupPath || null
      };
    }
    
    throw new Error(result.message);
  }
};