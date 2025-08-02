/**
 * Unregister command implementation
 * レジストリからリポジトリを削除（デプロイされたファイルは残す）
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { RegistryService } from '../core/RegistryService';
import { Repository } from '../types/repository';
import { promptYesNo } from '../utils/prompt';
import ora from 'ora';
import { selectRepository, displayNumberedRepositories } from '../utils/repository-selector';

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
            chalk.yellow(`\nRemove "${repo.name}" from registry? This will NOT remove deployed files. (y/N): `),
            false
          );
          
          if (!shouldUnregister) {
            console.log(chalk.gray('Skipping unregister'));
            continue;
          }
        }
        
        // レジストリから削除
        spinner.start('Removing from registry...');
        await registryService.remove(repo.id);
        spinner.succeed('Removed from registry');
        
        console.log(chalk.green(`✓ ${repo.name} unregistered successfully`));
        console.log(chalk.gray('  Note: Deployed files remain in .claude directory'));
        console.log(chalk.gray(`  Run 'ccpm uninstall ${repo.name}' to remove deployed files`));
        
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
  .description('Remove repository from registry (keeps deployed files)')
  .argument('[repository]', 'Repository name to unregister')
  .option('-f, --force', 'Skip removal confirmation prompt')
  .option('-a, --all', 'Unregister all repositories')
  .action(unregisterRepository);