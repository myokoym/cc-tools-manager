/**
 * Register Command Implementation
 * GitHubリポジトリをツールレジストリに登録するコマンド
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { RegistryService } from '../core/RegistryService';
import { Logger } from '../utils/logger';
import { ValidationError, ConflictError } from '../utils/errors';
import { CC_TOOLS_HOME } from '../constants/paths';
import * as path from 'path';

const logger = new Logger();

/**
 * リポジトリ登録コマンドの作成
 */
export function createRegisterCommand(): Command {
  const command = new Command('register')
    .alias('reg')
    .description('Register a GitHub repository to the tools registry')
    .argument('<url>', 'GitHub repository URL')
    .option('-d, --data-dir <dir>', 'Data directory path', CC_TOOLS_HOME)
    .action(async (url: string, options: { dataDir: string }) => {
      await handleRegister(url, options);
    });

  return command;
}

/**
 * リポジトリ登録処理のハンドラー
 */
async function handleRegister(url: string, options: { dataDir: string }): Promise<void> {
  const spinner = ora();
  
  try {
    // URLの表示
    console.log(chalk.blue('🔗 Repository URL:'), url);
    
    // レジストリサービスの初期化
    const registryService = new RegistryService(options.dataDir);
    
    // URL検証
    spinner.start('Validating repository URL...');
    if (!registryService.validateUrl(url)) {
      spinner.fail(chalk.red('Invalid GitHub repository URL format'));
      console.log(chalk.yellow('\nExpected format: https://github.com/owner/repository'));
      process.exit(1);
    }
    spinner.succeed('URL validation passed');
    
    // 登録処理
    spinner.start('Registering repository...');
    const repository = await registryService.register(url);
    spinner.succeed('Repository registered successfully');
    
    // 登録結果の表示
    console.log('\n' + chalk.green('✅ Registration Complete'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan('ID:'), repository.id);
    console.log(chalk.cyan('Name:'), repository.name);
    console.log(chalk.cyan('URL:'), repository.url);
    console.log(chalk.cyan('Status:'), chalk.yellow(repository.status));
    console.log(chalk.cyan('Registered:'), new Date(repository.registeredAt).toLocaleString());
    
    // 次のステップの案内
    console.log('\n' + chalk.blue('📋 Next Steps:'));
    console.log(chalk.gray('•'), `Run ${chalk.white('ccpm update ' + repository.name)} to clone and deploy the tools`);
    console.log(chalk.gray('•'), `Run ${chalk.white('ccpm list')} to see all registered repositories`);
    
    // ログ記録
    logger.info('Repository registered', {
      id: repository.id,
      name: repository.name,
      url: repository.url
    });
    
  } catch (error) {
    spinner.fail('Registration failed');
    
    if (error instanceof ValidationError) {
      console.error(chalk.red('\n❌ Validation Error:'), error.message);
      console.log(chalk.yellow('Please check the URL format and try again.'));
      logger.error('Validation error during registration', error);
    } else if (error instanceof ConflictError) {
      console.error(chalk.red('\n❌ Conflict:'), error.message);
      console.log(chalk.yellow('This repository is already registered.'));
      console.log(chalk.gray(`Run ${chalk.white('ccpm list')} to see all registered repositories.`));
      logger.warn('Duplicate registration attempt', { url });
    } else if (error instanceof Error) {
      console.error(chalk.red('\n❌ Error:'), error.message);
      logger.error('Unexpected error during registration', error);
    } else {
      console.error(chalk.red('\n❌ Unknown error occurred'));
      logger.error('Unknown error during registration', error);
    }
    
    process.exit(1);
  }
}

/**
 * コマンドのエクスポート
 */
export default createRegisterCommand;