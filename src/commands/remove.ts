/**
 * Remove Command
 * リポジトリの削除を実行するコマンド
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import { RegistryService } from '../core/RegistryService';
import { StateManager } from '../core/StateManager';
import { NotFoundError } from '../utils/errors';
import { remove as removeFile, fileExists } from '../utils/file-system';
import { REPOS_DIR } from '../constants/paths';
import { selectRepository, displayNumberedRepositories } from '../utils/repository-selector';

interface RemoveOptions {
  force?: boolean;
  keepFiles?: boolean;
  keepRepo?: boolean;
}

/**
 * removeコマンドの実装
 */
export function createRemoveCommand(): Command {
  const command = new Command('remove');

  command
    .description('Remove a repository from the registry')
    .argument('<repository>', 'Repository name or ID to remove')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('--keep-files', 'Keep deployed files')
    .option('--keep-repo', 'Keep local repository clone')
    .action(async (repository: string, options: RemoveOptions) => {
      await handleRemove(repository, options);
    });

  return command;
}

/**
 * リポジトリ削除の処理
 */
async function handleRemove(nameOrId: string, options: RemoveOptions): Promise<void> {
  const registryService = new RegistryService();
  const stateManager = new StateManager();
  const spinner = ora();

  try {
    // リポジトリを検索（番号またはID/名前）
    spinner.start('Finding repository...');
    const repository = await selectRepository(nameOrId);
    spinner.stop();

    if (!repository) {
      console.error(chalk.red(`✗ Repository not found: ${nameOrId}`));
      // 利用可能なリポジトリを表示
      const repositories = await registryService.list();
      if (repositories.length > 0) {
        displayNumberedRepositories(repositories);
      }
      process.exit(1);
    }

    // リポジトリ情報を表示
    console.log(chalk.cyan('\nRepository to be removed:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.bold('Name:')} ${repository.name}`);
    console.log(`${chalk.bold('URL:')} ${repository.url}`);
    console.log(`${chalk.bold('ID:')} ${repository.id}`);
    console.log(`${chalk.bold('Registered at:')} ${new Date(repository.registeredAt).toLocaleString()}`);
    
    // デプロイメント情報を表示
    const totalDeployments = 
      (repository.deployments.commands?.length || 0) +
      (repository.deployments.agents?.length || 0) +
      (repository.deployments.hooks?.length || 0);
    
    if (totalDeployments > 0) {
      console.log(chalk.yellow(`\n⚠  This repository has ${totalDeployments} active deployment(s):`));
      if (repository.deployments.commands && repository.deployments.commands.length > 0) {
        console.log(`   - ${repository.deployments.commands.length} command(s)`);
      }
      if (repository.deployments.agents && repository.deployments.agents.length > 0) {
        console.log(`   - ${repository.deployments.agents.length} agent(s)`);
      }
      if (repository.deployments.hooks && repository.deployments.hooks.length > 0) {
        console.log(`   - ${repository.deployments.hooks.length} hook(s)`);
      }
    }
    console.log(chalk.gray('─'.repeat(50)));

    // 確認プロンプトを表示（--forceオプションがない場合）
    if (!options.force) {
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: chalk.yellow('Are you sure you want to remove this repository?'),
          default: false
        }
      ]);

      if (!confirmed) {
        console.log(chalk.yellow('\n✗ Removal cancelled'));
        return;
      }
    }

    // デプロイされたファイルを取得
    const deployedFiles = await stateManager.removeRepositoryState(repository.id);
    let filesRemoved = 0;
    let repoRemoved = false;

    // デプロイされたファイルを削除（オプションが指定されていない場合）
    if (!options.keepFiles && deployedFiles.length > 0) {
      spinner.start(`Removing ${deployedFiles.length} deployed file(s)...`);
      
      for (const filePath of deployedFiles) {
        try {
          if (await fileExists(filePath)) {
            await removeFile(filePath);
            filesRemoved++;
          }
        } catch (error) {
          console.warn(chalk.yellow(`\n⚠  Could not remove file: ${filePath}`));
        }
      }
      
      spinner.succeed(`${filesRemoved} deployed file(s) removed`);
    }

    // ローカルリポジトリを削除（オプションが指定されていない場合）
    if (!options.keepRepo && repository.localPath) {
      spinner.start('Removing local repository clone...');
      
      try {
        const repoPath = repository.localPath;
        if (await fileExists(repoPath)) {
          await removeFile(repoPath);
          repoRemoved = true;
          spinner.succeed('Local repository removed');
        } else {
          spinner.info('Local repository not found');
        }
      } catch (error) {
        spinner.warn('Could not remove local repository');
      }
    }

    // リポジトリを削除
    spinner.start('Removing repository from registry...');
    await registryService.remove(repository.id);
    spinner.succeed('Repository removed from registry');

    // 成功メッセージ
    console.log(chalk.green(`\n✓ Repository '${repository.name}' has been removed`));
    
    // 削除内容のサマリー
    if (filesRemoved > 0 || repoRemoved) {
      console.log(chalk.gray('\nCleaned up:'));
      if (filesRemoved > 0) {
        console.log(chalk.gray(`  - ${filesRemoved} deployed file(s)`));
      }
      if (repoRemoved) {
        console.log(chalk.gray(`  - Local repository clone`));
      }
    }
    
    // 保持されたものの通知
    if (options.keepFiles || options.keepRepo) {
      console.log(chalk.yellow('\nRetained:'));
      if (options.keepFiles && deployedFiles.length > 0) {
        console.log(chalk.yellow(`  - ${deployedFiles.length} deployed file(s)`));
      }
      if (options.keepRepo && repository.localPath) {
        console.log(chalk.yellow(`  - Local repository at ${repository.localPath}`));
      }
    }

  } catch (error) {
    spinner.fail('Failed to remove repository');

    if (error instanceof NotFoundError) {
      console.error(chalk.red(`\n✗ Repository not found: ${nameOrId}`));
    } else if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));
    } else {
      console.error(chalk.red('\n✗ An unknown error occurred'));
    }

    process.exit(1);
  }
}