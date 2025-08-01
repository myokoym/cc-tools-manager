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
import { RepositoryType } from '../types';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import * as os from 'os';
import inquirer from 'inquirer';

const logger = new Logger();

/**
 * リポジトリ登録コマンドの作成
 */
export function createRegisterCommand(): Command {
  const command = new Command('register')
    .alias('reg')
    .description('Register a GitHub repository or text content to the tools registry')
    .argument('<url>', 'GitHub repository URL or "text" for text content')
    .option('-d, --data-dir <dir>', 'Data directory path', CC_TOOLS_HOME)
    .option('-t, --type <type>', 'Repository type (agents, commands, hooks)')
    .option('-n, --name <name>', 'Name for text content')
    .action(async (url: string, options: { dataDir: string; type?: string; name?: string }) => {
      if (url === 'text') {
        await handleTextRegister(options);
      } else {
        await handleRegister(url, options);
      }
    });

  return command;
}

/**
 * リポジトリ登録処理のハンドラー
 */
async function handleRegister(url: string, options: { dataDir: string; type?: string }): Promise<void> {
  const spinner = ora();
  
  try {
    // URLの表示
    console.log(chalk.blue('🔗 Repository URL:'), url);
    if (options.type) {
      console.log(chalk.blue('📁 Repository Type:'), options.type);
    }
    
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
    
    // タイプ検証
    if (options.type) {
      const validTypes: RepositoryType[] = ['agents', 'commands', 'hooks'];
      if (!validTypes.includes(options.type as RepositoryType)) {
        spinner.fail(chalk.red('Invalid repository type'));
        console.error(chalk.red(`\n❌ Error: '${options.type}' is not a valid type`));
        console.log(chalk.yellow(`Valid types are: ${validTypes.join(', ')}`));
        if (options.type === 'agent') {
          console.log(chalk.yellow(`Did you mean 'agents'?`));
        } else if (options.type === 'command') {
          console.log(chalk.yellow(`Did you mean 'commands'?`));
        } else if (options.type === 'hook') {
          console.log(chalk.yellow(`Did you mean 'hooks'?`));
        }
        process.exit(1);
      }
    }
    
    // 登録処理
    spinner.start('Registering repository...');
    const repository = options.type 
      ? await registryService.registerWithType(url, [options.type as RepositoryType])
      : await registryService.register(url);
    spinner.succeed('Repository registered successfully');
    
    // 登録結果の表示
    console.log('\n' + chalk.green('✅ Registration Complete'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan('ID:'), repository.id);
    console.log(chalk.cyan('Name:'), repository.name);
    console.log(chalk.cyan('URL:'), repository.url);
    if (repository.type) {
      console.log(chalk.cyan('Type:'), repository.type);
    }
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
      if (error.message.includes('type')) {
        console.log(chalk.yellow('Valid types are: agents, commands, hooks'));
      } else {
        console.log(chalk.yellow('Please check the URL format and try again.'));
      }
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
 * テキストコンテンツ登録処理のハンドラー
 */
async function handleTextRegister(options: { dataDir: string; type?: string; name?: string }): Promise<void> {
  const spinner = ora();
  
  try {
    // インタラクティブな情報収集
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Enter the name for this text content (.md will be added):',
        default: options.name,
        validate: (input) => input.trim().length > 0 || 'Name is required'
      },
      {
        type: 'list',
        name: 'type',
        message: 'Select the content type:',
        choices: ['commands', 'agents', 'hooks'],
        default: options.type || 'commands'
      }
    ]);
    
    const { name, type } = answers;
    
    // .mdが含まれていたら除去（念のため）
    const cleanName = name.replace(/\.md$/, '');
    
    // テキストコンテンツ用のディレクトリを作成
    const textContentDir = path.join(options.dataDir, 'text-contents');
    await fs.mkdir(textContentDir, { recursive: true });
    
    // 一時ファイルを作成してエディタで開く
    const tempFile = path.join(os.tmpdir(), `ccpm-text-${Date.now()}.md`);
    await fs.writeFile(tempFile, `# ${cleanName}\n\n# Type: ${type}\n# Enter your content below:\n\n`);
    
    console.log(chalk.blue('📝 Opening editor...'));
    
    // エディタを開く
    const editor = process.env.EDITOR || 'vi';
    await new Promise<void>((resolve, reject) => {
      const editorProcess = spawn(editor, [tempFile], { stdio: 'inherit' });
      editorProcess.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error('Editor exited with error'));
      });
    });
    
    // ファイル内容を読み込む
    const content = await fs.readFile(tempFile, 'utf-8');
    await fs.unlink(tempFile); // 一時ファイルを削除
    
    if (content.trim().length === 0) {
      throw new Error('No content was provided');
    }
    
    // コンテンツを保存
    const contentFile = path.join(textContentDir, `${cleanName}.md`);
    await fs.writeFile(contentFile, content);
    
    // レジストリサービスを使って仮想リポジトリとして登録
    spinner.start('Registering text content...');
    const registryService = new RegistryService(options.dataDir);
    const textUrl = `text://${cleanName}`;
    
    // 仮想リポジトリとして登録
    const repository = await registryService.registerWithType(textUrl, [type as RepositoryType]);
    spinner.succeed('Text content registered successfully');
    
    // 登録結果の表示
    console.log('\n' + chalk.green('✅ Registration Complete'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan('ID:'), repository.id);
    console.log(chalk.cyan('Name:'), cleanName);
    console.log(chalk.cyan('Type:'), type);
    console.log(chalk.cyan('File:'), `${cleanName}.md`);
    console.log(chalk.cyan('Status:'), chalk.yellow('text content'));
    console.log(chalk.cyan('Registered:'), new Date(repository.registeredAt).toLocaleString());
    
    // 次のステップの案内
    console.log('\n' + chalk.blue('📋 Next Steps:'));
    console.log(chalk.gray('•'), `Run ${chalk.white('ccpm update ' + cleanName)} to deploy the content`);
    console.log(chalk.gray('•'), `Run ${chalk.white('ccpm edit ' + cleanName)} to edit the content`);
    console.log(chalk.gray('•'), `Run ${chalk.white('ccpm list')} to see all registered items`);
    
  } catch (error) {
    spinner.fail('Registration failed');
    
    if (error instanceof Error) {
      console.error(chalk.red('\n❌ Error:'), error.message);
      logger.error('Text content registration failed', error);
    }
    
    process.exit(1);
  }
}

/**
 * コマンドのエクスポート
 */
export default createRegisterCommand;