/**
 * List command implementation
 * 登録済みリポジトリの一覧をテーブル形式で表示
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { RegistryService } from '../core/RegistryService';
import { StateManager } from '../core/StateManager';
import { Repository, RepositoryStatus } from '../types/repository';

/**
 * ステータスカラー定義
 */
const statusColors: Record<RepositoryStatus, (text: string) => string> = {
  active: chalk.green,
  error: chalk.red,
  uninitialized: chalk.gray
};

/**
 * ステータス表示文字列
 */
const statusDisplay: Record<RepositoryStatus, string> = {
  active: '● Active',
  error: '✗ Error',
  uninitialized: '○ Not Initialized'
};

/**
 * リポジトリ一覧を表示
 */
async function listRepositories(options: ListOptions): Promise<void> {
  const registryService = new RegistryService();
  const stateManager = new StateManager();
  
  try {
    // リポジトリ一覧を取得
    const repositories = await registryService.list();
    
    if (repositories.length === 0) {
      console.log(chalk.yellow('No repositories registered.'));
      console.log(chalk.gray('Use "cc-tools-manager register <url>" to add a repository.'));
      return;
    }
    
    // ヘッダー
    console.log(chalk.bold('\nRegistered Repositories:\n'));
    
    // テーブルヘッダー
    const headers = ['Name', 'Status', 'Deployments', 'Registered'];
    const columnWidths = [40, 20, 15, 20];
    
    // ヘッダー行を表示
    console.log(
      headers
        .map((header, i) => chalk.bold(header.padEnd(columnWidths[i])))
        .join('')
    );
    console.log(chalk.gray('─'.repeat(columnWidths.reduce((a, b) => a + b, 0))));
    
    // リポジトリ情報を表示
    repositories.forEach((repo) => {
      const deploymentCount = 
        (repo.deployments.commands?.length || 0) +
        (repo.deployments.agents?.length || 0) +
        (repo.deployments.hooks?.length || 0);
      
      const registeredDate = new Date(repo.registeredAt).toLocaleDateString();
      const statusColorFn = statusColors[repo.status];
      
      const row = [
        repo.name.padEnd(columnWidths[0]),
        statusColorFn(statusDisplay[repo.status]).padEnd(columnWidths[1] + 10), // カラーコードの分を追加
        deploymentCount.toString().padEnd(columnWidths[2]),
        registeredDate.padEnd(columnWidths[3])
      ];
      
      console.log(row.join(''));
    });
    
    // サマリー
    console.log(chalk.gray('─'.repeat(columnWidths.reduce((a, b) => a + b, 0))));
    console.log(chalk.gray(`Total: ${repositories.length} repositories`));
    
    // 詳細表示オプション
    if (options.verbose) {
      console.log(chalk.bold('\nDetailed Information:\n'));
      
      for (const repo of repositories) {
        console.log(chalk.bold(`${repo.name}:`));
        console.log(`  ID: ${chalk.gray(repo.id)}`);
        console.log(`  URL: ${chalk.gray(repo.url)}`);
        console.log(`  Status: ${statusColors[repo.status](repo.status)}`);
        
        if (repo.localPath) {
          console.log(`  Local Path: ${chalk.gray(repo.localPath)}`);
        }
        
        if (repo.lastUpdatedAt) {
          console.log(`  Last Updated: ${chalk.gray(new Date(repo.lastUpdatedAt).toLocaleString())}`);
        }
        
        // デプロイメント情報
        const hasDeployments = 
          (repo.deployments.commands?.length || 0) > 0 ||
          (repo.deployments.agents?.length || 0) > 0 ||
          (repo.deployments.hooks?.length || 0) > 0;
        
        if (hasDeployments) {
          console.log('  Deployments:');
          if (repo.deployments.commands?.length) {
            console.log(`    Commands: ${chalk.cyan(repo.deployments.commands.join(', '))}`);
          }
          if (repo.deployments.agents?.length) {
            console.log(`    Agents: ${chalk.cyan(repo.deployments.agents.join(', '))}`);
          }
          if (repo.deployments.hooks?.length) {
            console.log(`    Hooks: ${chalk.cyan(repo.deployments.hooks.join(', '))}`);
          }
        }
        
        // デプロイされたファイルの詳細を表示
        const repoState = await stateManager.getRepositoryState(repo.id);
        if (repoState && repoState.deployedFiles.length > 0) {
          console.log('  Deployed Files:');
          for (const file of repoState.deployedFiles) {
            console.log(`    ${chalk.gray(file.source)} → ${chalk.blue(file.target)}`);
            console.log(`      ${chalk.gray(`Deployed: ${new Date(file.deployedAt).toLocaleString()}`)}`);
          }
        }
        
        console.log();
      }
    }
    
    // ヒント
    if (!options.verbose) {
      console.log(chalk.gray('\nUse --verbose flag for detailed information.'));
    }
    
  } catch (error) {
    console.error(chalk.red('Error listing repositories:'), error);
    process.exit(1);
  }
}

/**
 * コマンドオプション
 */
interface ListOptions {
  verbose?: boolean;
}

/**
 * List command definition
 */
export const listCommand = new Command('list')
  .aliases(['ls'])
  .description('List all registered repositories')
  .option('-v, --verbose', 'Show detailed information')
  .action(listRepositories);