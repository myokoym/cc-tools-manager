import { glob } from 'glob';
import * as path from 'path';
import { promptYesNo } from '../utils/prompt';
import {
  IDeploymentService,
  PatternMatch,
  DeploymentResult,
  DeployedFile,
  ConflictStrategy
} from './interfaces/IDeploymentService';
import { Repository } from '../types';
import {
  copyFile,
  fileExists,
  getAllFiles,
  ensureDir,
  remove,
  getFileHash
} from '../utils/file-system';
import { CLAUDE_DIR } from '../constants/paths';
import { logger } from '../utils/logger';

/**
 * Deployment Service Implementation
 * ファイルデプロイメントとパターンマッチングを担当
 */
export class DeploymentService implements IDeploymentService {
  private readonly patterns = {
    commands: [
      '.claude/commands/**/*.{js,ts,mjs,md}',
      'commands/**/*.{js,ts,mjs,md}',
      '.claude/commands.{js,ts,mjs,md}',
      'commands.{js,ts,mjs,md}'
    ],
    agents: [
      '.claude/agents/**/*.{js,ts,mjs,md}',
      'agents/**/*.{js,ts,mjs,md}',
      '.claude/agents.{js,ts,mjs,md}',
      'agents.{js,ts,mjs,md}'
    ],
    hooks: [
      '.claude/hooks/**/*.{js,ts,mjs,md}',
      'hooks/**/*.{js,ts,mjs,md}',
      '.claude/hooks.{js,ts,mjs,md}',
      'hooks.{js,ts,mjs,md}'
    ]
  };

  /**
   * リポジトリのファイルをデプロイする
   */
  async deploy(repo: Repository, options?: { interactive?: boolean }): Promise<DeploymentResult> {
    logger.info(`Deploying files from ${repo.name}...`);
    
    const result: DeploymentResult = {
      deployed: [],
      skipped: [],
      failed: [],
      conflicts: []
    };

    try {
      // パターンを検出
      const patterns = await this.detectPatterns(repo.localPath || '');
      
      // 各ファイルをデプロイ
      for (const match of patterns) {
        const sourcePath = path.join(repo.localPath || '', match.file);
        const targetPath = this.getTargetPath(match);
        
        try {
          // ファイルが既に存在するかチェック
          if (await fileExists(targetPath)) {
            // デフォルトは上書き、--interactiveオプションでプロンプト表示
            const strategy: ConflictStrategy = options?.interactive ? 'prompt' : 'overwrite';
            const shouldContinue = await this.handleConflict(
              targetPath,
              strategy
            );
            
            if (!shouldContinue) {
              result.skipped.push(match.file);
              continue;
            }
          }
          
          // ファイルをコピー
          await this.copyWithStructure(sourcePath, targetPath);
          
          // ファイルのハッシュを計算
          const hash = await getFileHash(targetPath);
          
          // デプロイ情報を記録
          const deployedFile: DeployedFile = {
            source: match.file,
            target: targetPath,
            hash: hash,
            deployedAt: new Date().toISOString()
          };
          
          result.deployed.push(deployedFile);
          logger.info(`✓ Deployed: ${match.file}`);
          
        } catch (error) {
          result.failed.push(match.file);
          logger.error(`✗ Failed to deploy ${match.file}: ${error}`);
        }
      }
      
    } catch (error) {
      logger.error(`Deployment failed: ${error}`);
      throw error;
    }
    
    return result;
  }

  /**
   * リポジトリ内のパターンを検出する
   */
  async detectPatterns(repoPath: string): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];
    
    logger.info(`Detecting patterns in: ${repoPath}`);
    
    // 各ターゲットタイプのパターンを検査
    for (const [targetType, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        try {
          const files = await glob(pattern, {
            cwd: repoPath,
            nodir: true,
            ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
          });
          
          logger.debug(`Pattern ${pattern} found ${files.length} files`);
          
          for (const file of files) {
            matches.push({
              file,
              pattern,
              targetType: targetType as 'commands' | 'agents' | 'hooks'
            });
          }
        } catch (error) {
          logger.warn(`Pattern matching failed for ${pattern}: ${error}`);
        }
      }
    }
    
    // 重複を削除
    const uniqueMatches = matches.filter((match, index, self) =>
      index === self.findIndex(m => m.file === match.file)
    );
    
    logger.info(`Detected ${uniqueMatches.length} files to deploy`);
    return uniqueMatches;
  }

  /**
   * ディレクトリ構造を保持してファイルをコピーする
   */
  async copyWithStructure(source: string, target: string): Promise<void> {
    // ターゲットディレクトリを作成
    await ensureDir(path.dirname(target));
    
    // ファイルをコピー
    await copyFile(source, target);
  }

  /**
   * ファイル競合を処理する
   */
  async handleConflict(file: string, strategy: ConflictStrategy): Promise<boolean> {
    switch (strategy) {
      case 'skip':
        logger.info(`Skipping existing file: ${file}`);
        return false;
        
      case 'overwrite':
        logger.info(`Overwriting existing file: ${file}`);
        return true;
        
      case 'prompt':
        return await this.promptForConflict(file);
        
      default:
        throw new Error(`Unknown conflict strategy: ${strategy}`);
    }
  }

  /**
   * 孤立したファイルをクリーンアップする
   */
  async cleanOrphanedFiles(repo: Repository): Promise<number> {
    logger.info(`Cleaning orphaned files for ${repo.name}...`);
    
    let cleanedCount = 0;
    const deployedFiles: string[] = []; // TODO: Add deployedFiles tracking to Repository type
    
    // デプロイされたファイルが現在も存在するかチェック
    for (const deployedFile of deployedFiles) {
      const targetPath = path.join(CLAUDE_DIR, deployedFile);
      
      if (await fileExists(targetPath)) {
        // ソースファイルが存在するかチェック
        const sourcePath = path.join(repo.localPath || '', deployedFile);
        
        if (!await fileExists(sourcePath)) {
          // ソースが存在しない場合は削除
          await remove(targetPath);
          cleanedCount++;
          logger.info(`✓ Cleaned orphaned file: ${deployedFile}`);
        }
      }
    }
    
    logger.info(`Cleaned ${cleanedCount} orphaned files`);
    return cleanedCount;
  }

  /**
   * ターゲットパスを生成する
   */
  private getTargetPath(match: PatternMatch): string {
    // .claude/プレフィックスを削除
    let relativePath = match.file;
    if (relativePath.startsWith('.claude/')) {
      relativePath = relativePath.substring(8);
    }
    
    return path.join(CLAUDE_DIR, relativePath);
  }

  /**
   * ユーザーに競合の解決方法を尋ねる
   */
  private async promptForConflict(file: string): Promise<boolean> {
    return await promptYesNo(
      `File ${file} already exists. Overwrite? [y/N]: `,
      false,
      30000 // 30秒のタイムアウト
    );
  }

  /**
   * ファイルが同一かどうかをハッシュで確認
   */
  private async areFilesIdentical(file1: string, file2: string): Promise<boolean> {
    try {
      const hash1 = await getFileHash(file1);
      const hash2 = await getFileHash(file2);
      return hash1 === hash2;
    } catch {
      return false;
    }
  }
}