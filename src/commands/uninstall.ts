/**
 * Uninstall command implementation
 * .clauseディレクトリからデプロイされたファイルを削除
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RegistryService } from '../core/RegistryService';
import { StateManager } from '../core/StateManager';
import { Repository } from '../types/repository';
import { promptYesNo } from '../utils/prompt';
import ora from 'ora';
import { selectRepository, displayNumberedRepositories } from '../utils/repository-selector';
import { fileExists } from '../utils/file-system';

/**
 * アンインストールオプション
 */
interface UninstallOptions {
  force?: boolean;
  all?: boolean;
  dryRun?: boolean;
}

/**
 * リポジトリをアンインストール
 */
async function uninstallRepository(repositoryName: string | undefined, options: UninstallOptions): Promise<void> {
  const registryService = new RegistryService();
  const stateManager = new StateManager();
  
  try {
    const repositories = await registryService.list();
    
    if (repositories.length === 0) {
      console.log(chalk.yellow('No repositories registered.'));
      return;
    }
    
    // アンインストール対象のリポジトリを特定
    let targetRepos: Repository[];
    
    if (repositoryName) {
      // 番号またはID/名前で検索
      const repo = await selectRepository(repositoryName);
      if (!repo) {
        console.error(chalk.red(`Repository "${repositoryName}" not found.`));
        // 利用可能なリポジトリを表示
        if (repositories.length > 0) {
          displayNumberedRepositories(repositories);
        }
        process.exit(1);
      }
      targetRepos = [repo];
    } else {
      // リポジトリ名が指定されていない場合は全リポジトリをアンインストール
      targetRepos = repositories;
    }
    
    // 各リポジトリをアンインストール
    for (const repo of targetRepos) {
      console.log(chalk.bold(`\nUninstalling ${repo.name}...`));
      
      const spinner = ora();
      
      try {
        // 現在の状態を取得
        const state = await stateManager.getState();
        const repoState = state.repositories[repo.id];
        
        if (!repoState || !repoState.deployedFiles || repoState.deployedFiles.length === 0) {
          spinner.info('No deployed files found');
          continue;
        }
        
        spinner.succeed(`Found ${repoState.deployedFiles.length} deployed files`);
        
        // アンインストール確認（--forceでスキップ）
        if (!options.force) {
          const shouldUninstall = await promptYesNo(
            chalk.yellow(`\nRemove ${repoState.deployedFiles.length} deployed files? (y/N): `),
            false
          );
          
          if (!shouldUninstall) {
            console.log(chalk.gray('Skipping uninstall'));
            continue;
          }
        }
        
        // Dry runモード
        if (options.dryRun) {
          console.log(chalk.blue('\n🔍 DRY RUN MODE - No files will be removed\n'));
          for (const file of repoState.deployedFiles) {
            console.log(chalk.gray(`  Would remove: ${file.target}`));
          }
          continue;
        }
        
        // ファイルを削除
        spinner.start('Removing files...');
        let removedCount = 0;
        let failedCount = 0;
        
        for (const file of repoState.deployedFiles) {
          try {
            if (await fileExists(file.target)) {
              await fs.unlink(file.target);
              removedCount++;
            }
          } catch (error) {
            console.error(chalk.red(`Failed to remove ${file.target}: ${error}`));
            failedCount++;
          }
        }
        
        if (removedCount > 0) {
          spinner.succeed(`Removed ${removedCount} files`);
          
          // 状態を更新（deployedFilesをクリア）
          repoState.deployedFiles = [];
          repoState.lastSync = new Date().toISOString();
          await stateManager.saveState(state);
          
          // レジストリのdeploymentsフィールドもクリア
          await registryService.update(repo.id, { 
            deployments: {
              commands: [],
              agents: [],
              hooks: []
            }
          });
        } else {
          spinner.warn('No files were removed');
        }
        
        if (failedCount > 0) {
          console.error(chalk.red(`  Failed to remove ${failedCount} files`));
        }
        
        console.log(chalk.green(`✓ ${repo.name} uninstalled successfully`));
        
      } catch (error) {
        spinner.fail('Uninstall failed');
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`  Error: ${errorMessage}`));
        
        if (!options.all) {
          process.exit(1);
        }
      }
    }
    
    if (options.all) {
      console.log(chalk.bold(`\n✓ Uninstalled ${targetRepos.length} repositories`));
    }
    
  } catch (error) {
    console.error(chalk.red('Error uninstalling repository:'), error);
    process.exit(1);
  }
}

/**
 * Uninstall command definition
 */
export const uninstallCommand = new Command('uninstall')
  .description('Remove deployed files from .claude directory')
  .argument('[repository]', 'Repository name to uninstall')
  .option('-f, --force', 'Skip removal confirmation prompt')
  .option('-a, --all', 'Uninstall all repositories')
  .option('--dry-run', 'Show what would be removed without making changes')
  .action(uninstallRepository);