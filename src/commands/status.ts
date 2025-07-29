/**
 * Status command implementation
 * リポジトリのステータスを表示
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { RegistryService } from '../core/RegistryService';
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
  active: '✓ Active',
  error: '✗ Error',
  uninitialized: '○ Not Initialized'
};

/**
 * リポジトリのステータスを表示
 */
async function showStatus(repositoryName?: string): Promise<void> {
  const registryService = new RegistryService();
  
  try {
    if (repositoryName) {
      // 特定のリポジトリのステータスを表示
      const repositories = await registryService.list();
      const repo = repositories.find(r => r.name === repositoryName);
      
      if (!repo) {
        console.error(chalk.red(`Repository "${repositoryName}" not found.`));
        process.exit(1);
      }
      
      displayRepositoryStatus(repo);
    } else {
      // 全リポジトリのステータスサマリーを表示
      const repositories = await registryService.list();
      
      if (repositories.length === 0) {
        console.log(chalk.yellow('No repositories registered.'));
        return;
      }
      
      console.log(chalk.bold('\nRepository Status Summary:\n'));
      
      // ステータス別にカウント
      const statusCounts = repositories.reduce((acc, repo) => {
        acc[repo.status] = (acc[repo.status] || 0) + 1;
        return acc;
      }, {} as Record<RepositoryStatus, number>);
      
      // サマリー表示
      Object.entries(statusCounts).forEach(([status, count]) => {
        const colorFn = statusColors[status as RepositoryStatus];
        console.log(`  ${colorFn(statusDisplay[status as RepositoryStatus])}: ${count}`);
      });
      
      console.log(`\n  Total: ${repositories.length} repositories`);
      
      // 問題のあるリポジトリを表示
      const problemRepos = repositories.filter(r => r.status !== 'active');
      if (problemRepos.length > 0) {
        console.log(chalk.yellow('\nRepositories needing attention:'));
        problemRepos.forEach(repo => {
          console.log(`  - ${repo.name} (${statusColors[repo.status](repo.status)})`);
        });
      }
    }
  } catch (error) {
    console.error(chalk.red('Error checking status:'), error);
    process.exit(1);
  }
}

/**
 * 単一リポジトリの詳細ステータスを表示
 */
function displayRepositoryStatus(repo: Repository): void {
  console.log(chalk.bold(`\nStatus for ${repo.name}:\n`));
  
  // 基本情報
  console.log(`  Status: ${statusColors[repo.status](statusDisplay[repo.status])}`);
  console.log(`  URL: ${chalk.gray(repo.url)}`);
  
  if (repo.localPath) {
    console.log(`  Local Path: ${chalk.gray(repo.localPath)}`);
  }
  
  console.log(`  Registered: ${chalk.gray(new Date(repo.registeredAt).toLocaleString())}`);
  
  if (repo.lastUpdatedAt) {
    console.log(`  Last Updated: ${chalk.gray(new Date(repo.lastUpdatedAt).toLocaleString())}`);
  }
  
  // デプロイメント情報
  const hasDeployments = 
    (repo.deployments.commands?.length || 0) > 0 ||
    (repo.deployments.agents?.length || 0) > 0 ||
    (repo.deployments.hooks?.length || 0) > 0;
  
  if (hasDeployments) {
    console.log('\n  Deployments:');
    
    if (repo.deployments.commands?.length) {
      console.log(`    Commands (${repo.deployments.commands.length}):`);
      repo.deployments.commands.forEach(cmd => {
        console.log(`      - ${chalk.cyan(cmd)}`);
      });
    }
    
    if (repo.deployments.agents?.length) {
      console.log(`    Agents (${repo.deployments.agents.length}):`);
      repo.deployments.agents.forEach(agent => {
        console.log(`      - ${chalk.cyan(agent)}`);
      });
    }
    
    if (repo.deployments.hooks?.length) {
      console.log(`    Hooks (${repo.deployments.hooks.length}):`);
      repo.deployments.hooks.forEach(hook => {
        console.log(`      - ${chalk.cyan(hook)}`);
      });
    }
  } else {
    console.log(chalk.gray('\n  No deployments'));
  }
  
  // エラー情報がある場合
  if (repo.status === 'error') {
    console.log(chalk.red('\n  Error Details:'));
    console.log('    Repository is in error state');
  }
}

/**
 * Status command definition
 */
export const statusCommand = new Command('status')
  .description('Show repository status')
  .argument('[repository]', 'Repository name to check (optional)')
  .action(showStatus);