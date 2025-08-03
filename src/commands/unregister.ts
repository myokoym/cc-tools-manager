/**
 * Unregister command implementation
 * レジストリからリポジトリを削除（デプロイされたファイルは残す）
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import { RegistryService } from '../core/RegistryService';
import { StateManager } from '../core/StateManager';
import { Repository } from '../types/repository';
import { promptYesNo } from '../utils/prompt';
import ora from 'ora';
import { selectRepository, displayNumberedRepositories } from '../utils/repository-selector';
import { fileExists } from '../utils/file-system';

/**
 * アンレジスターオプション
 */
interface UnregisterOptions {
  force?: boolean;
  all?: boolean;
}

/**
 * リポジトリを登録解除
 */
async function unregisterRepository(repositoryName: string | undefined, options: UnregisterOptions): Promise<void> {
  const registryService = new RegistryService();
  const stateManager = new StateManager();
  
  try {
    const repositories = await registryService.list();
    
    if (repositories.length === 0) {
      console.log(chalk.yellow('No repositories registered.'));
      return;
    }
    
    // 登録解除対象のリポジトリを特定
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
      // リポジトリ名が指定されていない場合は全リポジトリを登録解除
      targetRepos = repositories;
    }
    
    // 各リポジトリを登録解除
    for (const repo of targetRepos) {
      console.log(chalk.bold(`\nUnregistering ${repo.name}...`));
      
      const spinner = ora();
      
      try {
        // 登録解除確認（--forceでスキップ）
        if (!options.force) {
          const shouldUnregister = await promptYesNo(
            chalk.yellow(`\nRemove "${repo.name}" from registry? (y/N): `),
            false
          );
          
          if (!shouldUnregister) {
            console.log(chalk.gray('Skipping unregister'));
            continue;
          }
        }
        
        // デプロイされたファイルの確認
        const state = await stateManager.getState();
        const repoState = state.repositories[repo.id];
        const hasDeployedFiles = repoState && repoState.deployedFiles && repoState.deployedFiles.length > 0;
        
        let filesRemoved = false;
        
        // デプロイされたファイルがある場合、削除するか確認（--forceでもこの確認は行う）
        if (hasDeployedFiles && !options.force) {
          const shouldRemoveFiles = await promptYesNo(
            chalk.yellow(`\nAlso remove ${repoState.deployedFiles.length} deployed files? (y/N): `),
            false
          );
          
          if (shouldRemoveFiles) {
            // ファイルを削除
            spinner.start('Removing deployed files...');
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
              filesRemoved = true;
              
              // 状態を更新（deployedFilesをクリア）
              repoState.deployedFiles = [];
              repoState.lastSync = new Date().toISOString();
              await stateManager.saveState(state);
            } else {
              spinner.warn('No files were removed');
            }
            
            if (failedCount > 0) {
              console.error(chalk.red(`  Failed to remove ${failedCount} files`));
            }
          }
        }
        
        // レジストリから削除
        spinner.start('Removing from registry...');
        await registryService.remove(repo.id);
        spinner.succeed('Removed from registry');
        
        console.log(chalk.green(`✓ ${repo.name} unregistered successfully`));
        
        if (hasDeployedFiles && !filesRemoved) {
          console.log(chalk.gray('  Note: Deployed files remain in .claude directory'));
          console.log(chalk.gray(`  Run 'ccpm uninstall ${repo.name}' to remove deployed files`));
        } else if (filesRemoved) {
          console.log(chalk.gray('  All deployed files have been removed'));
        }
        
      } catch (error) {
        spinner.fail('Unregister failed');
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`  Error: ${errorMessage}`));
        
        if (!options.all) {
          process.exit(1);
        }
      }
    }
    
    if (options.all) {
      console.log(chalk.bold(`\n✓ Unregistered ${targetRepos.length} repositories`));
    }
    
  } catch (error) {
    console.error(chalk.red('Error unregistering repository:'), error);
    process.exit(1);
  }
}

/**
 * Unregister command definition
 */
export const unregisterCommand = new Command('unregister')
  .description('Remove repository from registry (optionally remove deployed files)')
  .argument('[repository]', 'Repository name to unregister')
  .option('-f, --force', 'Skip prompts (keeps deployed files)')
  .option('-a, --all', 'Unregister all repositories')
  .action(unregisterRepository);