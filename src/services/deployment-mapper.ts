/**
 * DeploymentMapper Service
 * デプロイメント情報のマッピングと管理
 */

import * as path from 'path';
import { promises as fs } from 'fs';
import { Repository, RepositoryDeployments, RepositoryType } from '../types/repository';
import { fileExists, getAllFiles } from '../utils/file-system';

export interface DeploymentInfo {
  type: 'commands' | 'agents' | 'hooks';
  files: string[];
  deployedAt?: string;
  status: 'active' | 'error' | 'pending';
}

export interface DeploymentMapping {
  repository: Repository;
  deployments: DeploymentInfo[];
  totalFiles: number;
  lastDeployment?: string;
}

export interface SourceFile {
  sourcePath: string;
  type: 'commands' | 'agents' | 'hooks';
}

/**
 * デプロイメント情報をマッピングするサービス
 */
export class DeploymentMapper {
  
  /**
   * リポジトリのデプロイメント情報をマッピング
   */
  async mapDeployments(repository: Repository): Promise<DeploymentMapping> {
    try {
      if (!repository.localPath) {
        return {
          repository,
          deployments: [],
          totalFiles: 0
        };
      }

      const deploymentTypes: Array<'commands' | 'agents' | 'hooks'> = ['commands', 'agents', 'hooks'];
      const deployments: DeploymentInfo[] = [];
      let totalFiles = 0;
      let latestDeployment: string | undefined;

      // type-based deployment handling
      if (repository.type && repository.deploymentMode === 'type-based') {
        const sourceFiles = await this.scanSourceFilesForType(repository.localPath, repository.type);
        if (sourceFiles.length > 0) {
          const deploymentInfo = await this.createDeploymentInfo(repository.type, sourceFiles, repository.localPath);
          deployments.push(deploymentInfo);
          totalFiles += sourceFiles.length;
          if (deploymentInfo.deployedAt && (!latestDeployment || deploymentInfo.deployedAt > latestDeployment)) {
            latestDeployment = deploymentInfo.deployedAt;
          }
        }
      } else {
        // auto-detect or regular deployment - scan for all types
        for (const type of deploymentTypes) {
          const sourceFiles = await this.scanSourceFiles(repository.localPath, [type]);
          if (sourceFiles.length > 0) {
            const deploymentInfo = await this.createDeploymentInfo(type, sourceFiles, repository.localPath);
            deployments.push(deploymentInfo);
            totalFiles += sourceFiles.length;
            if (deploymentInfo.deployedAt && (!latestDeployment || deploymentInfo.deployedAt > latestDeployment)) {
              latestDeployment = deploymentInfo.deployedAt;
            }
          }
        }
      }

      return {
        repository,
        deployments,
        totalFiles,
        lastDeployment: latestDeployment
      };
    } catch (error) {
      return {
        repository,
        deployments: [],
        totalFiles: 0
      };
    }
  }

  /**
   * type-based deployment用のソースファイルスキャン（すべてのサポートされたファイルを指定タイプとして扱う）
   */
  async scanSourceFilesForType(repositoryPath: string, type: 'commands' | 'agents' | 'hooks'): Promise<SourceFile[]> {
    try {
      const allFiles = await getAllFiles(repositoryPath);
      const sourceFiles: SourceFile[] = [];

      for (const file of allFiles) {
        // Convert to relative path, but handle if it's already relative (for tests)
        let relativePath: string;
        if (path.isAbsolute(file)) {
          relativePath = path.relative(repositoryPath, file);
        } else {
          relativePath = file;
        }

        const normalizedPath = relativePath.replace(/\\/g, '/'); // Windows path support
        
        // Check if file has supported extension
        if (!this.isSupportedFile(normalizedPath)) {
          continue;
        }

        // For type-based deployment, all supported files belong to the specified type
        sourceFiles.push({
          sourcePath: normalizedPath,
          type
        });
      }

      return sourceFiles;
    } catch (error) {
      return [];
    }
  }

  /**
   * ソースファイルをスキャンして該当するファイルを取得
   */
  async scanSourceFiles(repositoryPath: string, types: Array<'commands' | 'agents' | 'hooks'>): Promise<SourceFile[]> {
    try {
      const allFiles = await getAllFiles(repositoryPath);
      const sourceFiles: SourceFile[] = [];

      for (const file of allFiles) {
        // Convert to relative path, but handle if it's already relative (for tests)
        let relativePath: string;
        if (path.isAbsolute(file)) {
          relativePath = path.relative(repositoryPath, file);
        } else {
          relativePath = file;
        }

        const normalizedPath = relativePath.replace(/\\/g, '/'); // Windows path support
        
        // Check if file has supported extension
        if (!this.isSupportedFile(normalizedPath)) {
          continue;
        }

        for (const type of types) {
          if (this.matchesTypePattern(normalizedPath, type)) {
            sourceFiles.push({
              sourcePath: normalizedPath,
              type
            });
            break; // Only match first type
          }
        }
      }

      return sourceFiles;
    } catch (error) {
      return [];
    }
  }

  /**
   * ファイルがサポートされた拡張子かチェック
   */
  private isSupportedFile(filePath: string): boolean {
    const supportedExtensions = ['.js', '.ts', '.mjs', '.md'];
    const ext = path.extname(filePath);
    return supportedExtensions.includes(ext);
  }

  /**
   * ファイルパスがタイプのパターンにマッチするかチェック
   */
  private matchesTypePattern(filePath: string, type: 'commands' | 'agents' | 'hooks'): boolean {
    // .claude/ prefixed patterns
    if (filePath.startsWith(`.claude/${type}/`)) {
      return true;
    }

    // Root-level directory patterns
    if (filePath.startsWith(`${type}/`)) {
      return true;
    }

    // Single file patterns (e.g., commands.js, agents.js, hooks.js)
    if (filePath === `${type}.js` || filePath === `${type}.ts` || filePath === `${type}.mjs` || filePath === `${type}.md`) {
      return true;
    }

    return false;
  }

  /**
   * デプロイメント情報を作成
   */
  private async createDeploymentInfo(
    type: 'commands' | 'agents' | 'hooks', 
    sourceFiles: SourceFile[], 
    repositoryPath: string
  ): Promise<DeploymentInfo> {
    const files = sourceFiles
      .filter(sf => sf.type === type)
      .map(sf => sf.sourcePath);

    let deployedAt: string | undefined;
    let status: 'active' | 'error' | 'pending' = 'pending';

    if (files.length > 0) {
      try {
        // Get the latest modification time
        const stats = await Promise.all(
          files.map(async file => {
            try {
              const fullPath = path.join(repositoryPath, file);
              return await fs.stat(fullPath);
            } catch {
              return null;
            }
          })
        );

        const validStats = stats.filter(s => s !== null);
        if (validStats.length > 0) {
          const latestMtime = Math.max(...validStats.map(s => s!.mtime.getTime()));
          deployedAt = new Date(latestMtime).toISOString();
          status = 'active';
        } else {
          status = 'error';
        }
      } catch {
        status = 'error';
      }
    }

    return {
      type,
      files,
      deployedAt,
      status
    };
  }

  /**
   * ターゲットパスを解決
   */
  async resolveTargetPath(sourcePath: string): Promise<string> {
    if (!sourcePath || sourcePath === '/' || sourcePath === '.') {
      return sourcePath;
    }

    // .claude/ prefixed paths -> remove .claude/ prefix
    if (sourcePath.startsWith('.claude/')) {
      return sourcePath.substring('.claude/'.length);
    }

    // Single file patterns -> move to appropriate directory
    const singleFilePattern = /^(commands|agents|hooks)\.(js|ts|mjs|md)$/;
    const match = sourcePath.match(singleFilePattern);
    if (match) {
      const [, type, ext] = match;
      return `${type}/${type}.${ext}`;
    }

    // Root-level paths remain as is
    return sourcePath;
  }

  /**
   * デプロイメントステータスをチェック
   */
  async checkDeploymentStatus(deploymentInfo: DeploymentInfo, claudePath: string): Promise<DeploymentInfo> {
    if (deploymentInfo.files.length === 0) {
      return { ...deploymentInfo, status: 'pending' };
    }

    try {
      const fileChecks = await Promise.all(
        deploymentInfo.files.map(async file => {
          const targetPath = await this.resolveTargetPath(file);
          const fullPath = path.join(claudePath, targetPath);
          return await fileExists(fullPath);
        })
      );

      const allExist = fileChecks.every(exists => exists);
      const status = allExist ? 'active' : 'error';

      return { ...deploymentInfo, status };
    } catch {
      return { ...deploymentInfo, status: 'error' };
    }
  }

  /**
   * ファイルをディレクトリ別にグループ化
   */
  async groupByDirectory(files: SourceFile[]): Promise<Record<string, SourceFile[]>> {
    const groups: Record<string, SourceFile[]> = {};

    for (const file of files) {
      const dir = path.dirname(file.sourcePath);
      const normalizedDir = dir === '.' ? '.' : dir.replace(/\\/g, '/');
      
      if (!groups[normalizedDir]) {
        groups[normalizedDir] = [];
      }
      groups[normalizedDir].push(file);
    }

    return groups;
  }

  /**
   * 特定タイプのデプロイメント情報を取得
   */
  async getDeploymentsByType(
    repository: Repository, 
    type: 'commands' | 'agents' | 'hooks'
  ): Promise<DeploymentInfo[]> {
    try {
      if (!repository.localPath) {
        return [];
      }

      const sourceFiles = await this.scanSourceFiles(repository.localPath, [type]);
      if (sourceFiles.length === 0) {
        return [];
      }

      const deploymentInfo = await this.createDeploymentInfo(type, sourceFiles, repository.localPath);
      return [deploymentInfo];
    } catch {
      return [];
    }
  }

  /**
   * デプロイされたファイル一覧を取得
   */
  async getDeployedFiles(repository: Repository): Promise<string[]> {
    try {
      if (!repository.localPath) {
        return [];
      }

      const types: Array<'commands' | 'agents' | 'hooks'> = ['commands', 'agents', 'hooks'];
      const sourceFiles = await this.scanSourceFiles(repository.localPath, types);
      
      const targetPaths = await Promise.all(
        sourceFiles.map(file => this.resolveTargetPath(file.sourcePath))
      );

      return targetPaths;
    } catch {
      return [];
    }
  }

  /**
   * デプロイメント設定を検証
   */
  async validateDeployments(deployments: RepositoryDeployments): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!deployments) {
      return { isValid: true, errors, warnings };
    }

    const types: Array<'commands' | 'agents' | 'hooks'> = ['commands', 'agents', 'hooks'];
    const allPatterns: string[] = [];

    for (const type of types) {
      const patterns = deployments[type] || [];
      
      for (const pattern of patterns) {
        // Check for invalid glob patterns
        if (pattern.includes('[') && !pattern.includes(']')) {
          errors.push(`Invalid pattern '${pattern}' in ${type}: unmatched bracket`);
          continue;
        }

        // Check for overly broad patterns
        if (pattern === '**/*') {
          warnings.push(`Pattern '${pattern}' in ${type} is very broad and may cause conflicts`);
        }

        allPatterns.push(pattern);
      }
    }

    // Check for conflicting patterns
    const patternCounts = new Map<string, string[]>();
    for (const type of types) {
      const patterns = deployments[type] || [];
      for (const pattern of patterns) {
        if (!patternCounts.has(pattern)) {
          patternCounts.set(pattern, []);
        }
        patternCounts.get(pattern)!.push(type);
      }
    }

    for (const [pattern, typesUsingPattern] of patternCounts) {
      if (typesUsingPattern.length > 1) {
        warnings.push(`Pattern '${pattern}' is used by multiple types: ${typesUsingPattern.join(', ')} - this may cause deployment conflicts`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * リポジトリのデプロイメント情報を取得 (legacy compatibility)
   */
  async getDeploymentMapping(repository: Repository): Promise<DeploymentMapping> {
    return this.mapDeployments(repository);
  }
}