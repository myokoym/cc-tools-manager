/**
 * OutputFormatter
 * 様々な出力形式をサポートするフォーマッター
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import * as yaml from 'js-yaml';
import { Repository } from '../types/repository';
import { DeploymentMapping, DeploymentInfo } from '../services/deployment-mapper';
import { formatPathWithHome, generateDeployedFilesTree } from '../utils/tree';
import * as path from 'path';

export interface DeploymentMappingWithState extends DeploymentMapping {
  deployedFiles?: {
    source: string;
    target: string;
    hash: string;
    deployedAt: string;
  }[];
}

export type OutputFormat = 'table' | 'json' | 'yaml' | 'tree';

export interface FormatterOptions {
  format: OutputFormat;
  verbose?: boolean;
  colors?: boolean;
  indent?: number;
  terminalWidth?: number;
}

export interface TableColumn {
  header: string;
  field: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  transform?: (value: any) => string;
}

export interface FileMapping {
  sourcePath: string;
  targetPath: string;
  type: 'commands' | 'agents' | 'hooks';
  status: 'deployed' | 'pending' | 'error';
  deployedAt?: string;
}

export interface DeploymentStats {
  totalFiles: number;
  deployedFiles: number;
  pendingFiles: number;
  errorFiles: number;
  lastDeployment?: string;
}

/**
 * 出力フォーマッターサービス
 * 美観的で情報豊富な出力を提供
 */
export class OutputFormatter {
  private terminalWidth: number;

  constructor() {
    this.terminalWidth = process.stdout.columns || 80;
  }

  /**
   * メインフォーマット関数 - オプションに基づいて適切なフォーマッターに振り分け
   */
  format(data: any, options: FormatterOptions): string {
    const formatterOptions = {
      ...options,
      terminalWidth: options.terminalWidth || this.terminalWidth
    };

    switch (options.format) {
      case 'json':
        return this.formatJson(data, formatterOptions);
      case 'yaml':
        return this.formatYaml(data, formatterOptions);
      case 'tree':
        return this.formatTree(data, formatterOptions);
      default:
        return this.formatText(data, formatterOptions);
    }
  }

  /**
   * リポジトリ情報をフォーマットして出力
   */
  async formatRepository(
    repository: Repository, 
    options: FormatterOptions
  ): Promise<string> {
    return this.format(repository, options);
  }

  /**
   * 複数リポジトリをフォーマットして出力
   */
  async formatRepositories(
    repositories: Repository[], 
    options: FormatterOptions
  ): Promise<string> {
    return this.format(repositories, options);
  }

  /**
   * デプロイメントマッピング情報をフォーマット
   */
  async formatDeploymentMapping(
    mapping: DeploymentMapping | DeploymentMappingWithState,
    options: FormatterOptions
  ): Promise<string> {
    return this.formatDeploymentDetails(mapping, options);
  }

  /**
   * ファイルマッピング情報をフォーマット
   */
  async formatFileMappings(
    mappings: FileMapping[],
    options: FormatterOptions
  ): Promise<string> {
    return this.formatFileMappingDetails(mappings, options);
  }

  /**
   * ファイル一覧をツリー形式でフォーマット
   */
  async formatFileTree(
    files: string[], 
    options: FormatterOptions
  ): Promise<string> {
    if (files.length === 0) {
      return this.applyColor('No files to display', 'gray', options);
    }

    const deployedFiles = files.map(file => ({
      target: file,
      deployedAt: new Date().toISOString()
    }));

    const treeLines = generateDeployedFilesTree(deployedFiles);
    return treeLines.join('\n');
  }

  /**
   * JSON形式でフォーマット
   */
  formatJson(data: any, options: FormatterOptions): string {
    const indent = options.verbose ? 2 : 0;
    return JSON.stringify(data, null, indent);
  }

  /**
   * YAML形式でフォーマット
   */
  formatYaml(data: any, options: FormatterOptions): string {
    try {
      return yaml.dump(data, {
        indent: options.indent || 2,
        lineWidth: options.terminalWidth || 80,
        noRefs: true,
        sortKeys: true
      });
    } catch (error) {
      return `Error formatting YAML: ${error}`;
    }
  }

  /**
   * テーブル/テキスト形式でフォーマット（chalk使用でカラー対応）
   */
  formatText(data: any, options: FormatterOptions): string {
    if (Array.isArray(data)) {
      return this.formatRepositoryTable(data, options);
    } else if (data.repository && data.deployments) {
      return this.formatDeploymentDetails(data, options);
    } else {
      return this.formatSingleRepository(data, options);
    }
  }

  /**
   * ツリー形式でフォーマット
   */
  formatTree(data: any, options: FormatterOptions): string {
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
      // ファイルパスの配列の場合
      const deployedFiles = data.map((file: string) => ({
        target: file,
        deployedAt: new Date().toISOString()
      }));
      const treeLines = generateDeployedFilesTree(deployedFiles);
      return treeLines.join('\n');
    }
    
    // その他のデータの場合はテキスト形式にフォールバック
    return this.formatText(data, options);
  }

  /**
   * リポジトリテーブルをフォーマット
   */
  private formatRepositoryTable(repositories: Repository[], options: FormatterOptions): string {
    if (repositories.length === 0) {
      return this.applyColor('No repositories to display', 'gray', options);
    }

    const table = new Table({
      head: [
        this.applyColor('Name', 'bold', options),
        this.applyColor('Status', 'bold', options),
        this.applyColor('Type', 'bold', options),
        this.applyColor('Deployments', 'bold', options),
        this.applyColor('Registered', 'bold', options)
      ],
      colWidths: this.calculateColumnWidths(options.terminalWidth || 80),
      style: {
        head: [],
        border: []
      },
      chars: {
        'top': '─',
        'top-mid': '┬',
        'top-left': '┌',
        'top-right': '┐',
        'bottom': '─',
        'bottom-mid': '┴',
        'bottom-left': '└',
        'bottom-right': '┘',
        'left': '│',
        'left-mid': '├',
        'mid': '─',
        'mid-mid': '┼',
        'right': '│',
        'right-mid': '┤',
        'middle': '│'
      }
    });

    repositories.forEach(repo => {
      table.push([
        this.truncatePath(repo.name, 20),
        this.getStatusDisplay(repo.status, options),
        this.applyColor(repo.type || 'auto-detect', 'cyan', options),
        this.getDeploymentCount(repo).toString(),
        this.formatDate(repo.registeredAt)
      ]);
    });

    return table.toString();
  }

  /**
   * 単一リポジトリをフォーマット
   */
  private formatSingleRepository(repository: Repository, options: FormatterOptions): string {
    const lines: string[] = [];
    
    lines.push(this.applyColor(`\nRepository: ${repository.name}`, 'bold', options));
    lines.push('');
    if (options.verbose) {
      lines.push(`  ID: ${this.applyColor(repository.id, 'gray', options)}`);
    }
    lines.push(`  URL: ${this.applyColor(repository.url, 'blue', options)}`);
    lines.push(`  Status: ${this.getStatusDisplay(repository.status, options)}`);
    lines.push(`  Registered: ${this.applyColor(this.formatDate(repository.registeredAt), 'gray', options)}`);
    
    if (repository.type) {
      lines.push(`  Type: ${this.applyColor(repository.type, 'cyan', options)}`);
    }
    
    if (repository.deploymentMode) {
      lines.push(`  Deployment Mode: ${this.applyColor(repository.deploymentMode, 'cyan', options)}`);
    }
    
    if (repository.localPath) {
      lines.push(`  Local Path: ${this.applyColor(this.truncatePath(repository.localPath, 60), 'gray', options)}`);
    }
    
    if (repository.lastUpdatedAt) {
      lines.push(`  Last Updated: ${this.applyColor(this.formatDate(repository.lastUpdatedAt), 'gray', options)}`);
    }

    return lines.join('\n');
  }

  /**
   * デプロイメント詳細をフォーマット
   */
  private formatDeploymentDetails(mapping: DeploymentMapping | DeploymentMappingWithState, options: FormatterOptions): string {
    const lines: string[] = [];
    
    lines.push(this.applyColor('\nDeployments:', 'bold', options));
    lines.push('');

    // deployedFilesまたはdeploymentsがあるかチェック
    const hasDeployedFiles = 'deployedFiles' in mapping && mapping.deployedFiles && mapping.deployedFiles.length > 0;
    const hasDeployments = mapping.deployments.length > 0;
    
    if (!hasDeployedFiles && !hasDeployments) {
      lines.push(this.applyColor('  No deployments configured.', 'gray', options));
      return lines.join('\n');
    }

    // デプロイメント統計
    const stats = this.calculateDeploymentStats(mapping.deployments);
    lines.push(this.formatDeploymentStats(stats, options));
    lines.push('');

    // deployedFilesがある場合はそれを使用（state.jsonからの実際のデプロイ情報）
    if ('deployedFiles' in mapping && mapping.deployedFiles && mapping.deployedFiles.length > 0) {
      // state.jsonからのデプロイ情報をディレクトリごとにグループ化
      const groupedStateFiles: Record<string, typeof mapping.deployedFiles> = {};
      
      for (const deployedFile of mapping.deployedFiles) {
        const dir = path.dirname(deployedFile.source);
        const normalizedDir = dir === '.' ? 'Root' : dir;
        
        if (!groupedStateFiles[normalizedDir]) {
          groupedStateFiles[normalizedDir] = [];
        }
        groupedStateFiles[normalizedDir].push(deployedFile);
      }
      
      for (const [directory, files] of Object.entries(groupedStateFiles)) {
        lines.push(this.applyColor(`  ${directory}:`, 'bold', options));
        
        for (const file of files) {
          const arrow = this.applyColor('→', 'gray', options);
          const statusText = this.applyColor('[deployed]', 'green', options);
          
          // フルパスを表示（ホームディレクトリは~に置換）
          const formattedSource = formatPathWithHome(file.source);
          const formattedTarget = formatPathWithHome(file.target);
          
          lines.push(`    ${formattedSource} ${arrow} ${formattedTarget} ${statusText}`);
        }
        lines.push('');
      }
    } else {
      // 従来のロジック（deploymentsフィールドのみを使用）
      const groupedFiles = this.groupFilesByDirectory(mapping.deployments);
      
      for (const [directory, deploymentInfos] of Object.entries(groupedFiles)) {
        lines.push(this.applyColor(`  ${directory || 'Root'}:`, 'bold', options));
        
        for (const info of deploymentInfos) {
          for (const file of info.files) {
            const sourcePath = file;
            const targetPath = this.resolveTargetPath(sourcePath);
            const arrow = this.applyColor('→', 'gray', options);
            const statusColor = this.getStatusColor(info.status);
            const statusText = this.applyColor(`[${info.status}]`, statusColor, options);
            
            // フルパスを表示（ホームディレクトリは~に置換）
            const formattedSource = formatPathWithHome(sourcePath);
            const formattedTarget = formatPathWithHome(targetPath);
            
            lines.push(`    ${formattedSource} ${arrow} ${formattedTarget} ${statusText}`);
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * ファイルマッピング詳細をフォーマット
   */
  private formatFileMappingDetails(mappings: FileMapping[], options: FormatterOptions): string {
    const lines: string[] = [];
    
    if (mappings.length === 0) {
      return this.applyColor('No file mappings to display', 'gray', options);
    }

    // ディレクトリごとにグループ化
    const groupedMappings = this.groupMappingsByDirectory(mappings);
    
    lines.push(this.applyColor('File Mappings:', 'bold', options));
    lines.push('');

    for (const [directory, fileMappings] of Object.entries(groupedMappings)) {
      lines.push(this.applyColor(`  ${directory || 'Root'}:`, 'bold', options));
      
      for (const mapping of fileMappings) {
        const arrow = this.applyColor('→', 'gray', options);
        const statusColor = this.getStatusColor(mapping.status);
        const statusText = this.applyColor(`[${mapping.status}]`, statusColor, options);
        const typeText = this.applyColor(`(${mapping.type})`, 'cyan', options);
        
        // フルパスを表示（ホームディレクトリは~に置換）
        const formattedSource = formatPathWithHome(mapping.sourcePath);
        const formattedTarget = formatPathWithHome(mapping.targetPath);
        
        lines.push(`    ${formattedSource} ${arrow} ${formattedTarget} ${statusText} ${typeText}`);
        
        if (mapping.deployedAt && options.verbose) {
          lines.push(`      ${this.applyColor(`Deployed: ${this.formatDate(mapping.deployedAt)}`, 'gray', options)}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * パスをスマートに切り詰める
   */
  truncatePath(fullPath: string, maxLength: number): string {
    if (fullPath.length <= maxLength) {
      return fullPath;
    }

    // ホームディレクトリの置換
    const homePath = formatPathWithHome(fullPath);
    if (homePath.length <= maxLength) {
      return homePath;
    }

    // パスの中央部分を省略
    const parts = fullPath.split(path.sep);
    if (parts.length <= 2) {
      return fullPath.substring(0, maxLength - 3) + '...';
    }

    let result = parts[0];
    let endPart = parts[parts.length - 1];
    
    if (result.length + endPart.length + 5 > maxLength) {
      // ファイル名も長い場合
      endPart = endPart.substring(0, Math.max(1, maxLength - result.length - 8)) + '...';
    }
    
    return `${result}/.../${endPart}`;
  }

  /**
   * デプロイメント数を計算
   */
  private getDeploymentCount(repository: Repository): number {
    return (repository.deployments.commands?.length || 0) +
           (repository.deployments.agents?.length || 0) +
           (repository.deployments.hooks?.length || 0);
  }

  /**
   * カラー付きテキストの生成
   */
  private applyColor(text: string, colorName: string, options: FormatterOptions): string {
    // Default to colors enabled unless explicitly disabled
    if (options.colors === false) {
      return text;
    }

    switch (colorName) {
      case 'red': return chalk.red(text);
      case 'green': return chalk.green(text);
      case 'yellow': return chalk.yellow(text);
      case 'blue': return chalk.blue(text);
      case 'cyan': return chalk.cyan(text);
      case 'gray': return chalk.gray(text);
      case 'bold': return chalk.bold(text);
      case 'dim': return chalk.dim(text);
      default: return text;
    }
  }

  /**
   * ステータス表示を取得
   */
  private getStatusDisplay(status: Repository['status'], options: FormatterOptions): string {
    const statusColors = {
      active: 'green',
      error: 'red',
      uninitialized: 'gray'
    };
    
    return this.applyColor(status, statusColors[status], options);
  }

  /**
   * ステータスに応じた色名を取得
   */
  private getStatusColor(status: string): string {
    switch (status) {
      case 'deployed':
      case 'active':
        return 'green';
      case 'pending':
        return 'yellow';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  }

  /**
   * 日付をフォーマット
   */
  private formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }

  /**
   * ターミナル幅に基づいて列幅を計算
   */
  private calculateColumnWidths(terminalWidth: number): number[] {
    const totalWidth = Math.max(terminalWidth - 10, 60); // マージンを考慮
    return [
      Math.floor(totalWidth * 0.25), // Name
      Math.floor(totalWidth * 0.15), // Status
      Math.floor(totalWidth * 0.15), // Type
      Math.floor(totalWidth * 0.15), // Deployments
      Math.floor(totalWidth * 0.3)   // Registered
    ];
  }

  /**
   * デプロイメント統計を計算
   */
  private calculateDeploymentStats(deployments: DeploymentInfo[]): DeploymentStats {
    let totalFiles = 0;
    let deployedFiles = 0;
    let pendingFiles = 0;
    let errorFiles = 0;
    let lastDeployment: string | undefined;

    for (const deployment of deployments) {
      totalFiles += deployment.files.length;
      
      switch (deployment.status) {
        case 'active':
          deployedFiles += deployment.files.length;
          break;
        case 'pending':
          pendingFiles += deployment.files.length;
          break;
        case 'error':
          errorFiles += deployment.files.length;
          break;
      }

      if (deployment.deployedAt) {
        if (!lastDeployment || deployment.deployedAt > lastDeployment) {
          lastDeployment = deployment.deployedAt;
        }
      }
    }

    return {
      totalFiles,
      deployedFiles,
      pendingFiles,
      errorFiles,
      lastDeployment
    };
  }

  /**
   * デプロイメント統計をフォーマット
   */
  private formatDeploymentStats(stats: DeploymentStats, options: FormatterOptions): string {
    const lines: string[] = [];
    
    lines.push(`  ${this.applyColor('Summary:', 'bold', options)}`);
    lines.push(`    Total Files: ${this.applyColor(stats.totalFiles.toString(), 'bold', options)}`);
    
    if (stats.deployedFiles > 0) {
      lines.push(`    Deployed: ${this.applyColor(stats.deployedFiles.toString(), 'green', options)}`);
    }
    
    if (stats.pendingFiles > 0) {
      lines.push(`    Pending: ${this.applyColor(stats.pendingFiles.toString(), 'yellow', options)}`);
    }
    
    if (stats.errorFiles > 0) {
      lines.push(`    Errors: ${this.applyColor(stats.errorFiles.toString(), 'red', options)}`);
    }
    
    if (stats.lastDeployment) {
      lines.push(`    Last Deployment: ${this.applyColor(this.formatDate(stats.lastDeployment), 'gray', options)}`);
    }

    return lines.join('\n');
  }

  /**
   * ファイルをディレクトリごとにグループ化
   */
  private groupFilesByDirectory(deployments: DeploymentInfo[]): Record<string, DeploymentInfo[]> {
    const groups: Record<string, DeploymentInfo[]> = {};

    for (const deployment of deployments) {
      for (const file of deployment.files) {
        const dir = path.dirname(file);
        const normalizedDir = dir === '.' ? 'Root' : dir;
        
        if (!groups[normalizedDir]) {
          groups[normalizedDir] = [];
        }
        
        // このディレクトリにこのdeploymentがまだ追加されていない場合のみ追加
        const existingDeployment = groups[normalizedDir].find(d => 
          d.type === deployment.type && d.status === deployment.status
        );
        
        if (!existingDeployment) {
          groups[normalizedDir].push({
            ...deployment,
            files: deployment.files.filter(f => path.dirname(f) === dir)
          });
        }
      }
    }

    return groups;
  }

  /**
   * ファイルマッピングをディレクトリごとにグループ化
   */
  private groupMappingsByDirectory(mappings: FileMapping[]): Record<string, FileMapping[]> {
    const groups: Record<string, FileMapping[]> = {};

    for (const mapping of mappings) {
      const dir = path.dirname(mapping.sourcePath);
      const normalizedDir = dir === '.' ? 'Root' : dir;
      
      if (!groups[normalizedDir]) {
        groups[normalizedDir] = [];
      }
      groups[normalizedDir].push(mapping);
    }

    return groups;
  }

  /**
   * ソースパスからターゲットパスを解決
   */
  private resolveTargetPath(sourcePath: string): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
    const claudeDir = path.join(homeDir, '.claude');
    
    // .claude/ prefixed paths -> ~/.claude/ + path without .claude/
    if (sourcePath.startsWith('.claude/')) {
      return path.join(claudeDir, sourcePath.substring('.claude/'.length));
    }

    // Single file patterns -> ~/.claude/type/type.ext
    const singleFilePattern = /^(commands|agents|hooks)\.(js|ts|mjs|md)$/;
    const match = sourcePath.match(singleFilePattern);
    if (match) {
      const [, type, ext] = match;
      return path.join(claudeDir, type, `${type}.${ext}`);
    }

    // Directory patterns -> ~/.claude/ + path
    return path.join(claudeDir, sourcePath);
  }

  /**
   * カスタムテンプレートでフォーマット
   */
  formatWithTemplate(data: any, template: string, options: FormatterOptions): string {
    // 基本的な変数置換を実装
    let result = template;
    
    if (typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }
    
    return result;
  }

  /**
   * カラー付きテキストの生成（公開API）
   */
  formatWithColor(text: string, color: string, options: FormatterOptions): string {
    return this.applyColor(text, color, options);
  }
}