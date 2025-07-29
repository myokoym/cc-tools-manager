/**
 * Remove Command
 * リポジトリの削除を実行するコマンド
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { RegistryService } from '../core/RegistryService';
import { NotFoundError } from '../utils/errors';

interface RemoveOptions {
  force?: boolean;
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
  const spinner = ora();

  try {
    // リポジトリを検索
    spinner.start('Finding repository...');
    const repository = await registryService.find(nameOrId);
    spinner.stop();

    if (!repository) {
      console.error(chalk.red(`✗ Repository not found: ${nameOrId}`));
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

    // リポジトリを削除
    spinner.start('Removing repository...');
    await registryService.remove(repository.id);
    spinner.succeed('Repository removed successfully');

    // 成功メッセージ
    console.log(chalk.green(`\n✓ Repository '${repository.name}' has been removed`));
    
    if (totalDeployments > 0) {
      console.log(chalk.yellow('\n⚠  Note: Deployed components may still be active.'));
      console.log(chalk.yellow('   Consider running cleanup commands if necessary.'));
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