/**
 * Edit Command Implementation
 * テキストコンテンツを編集するコマンド
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { RegistryService } from '../core/RegistryService';
import { Logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import { CCPM_HOME } from '../constants/paths';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import * as os from 'os';

const logger = new Logger();

/**
 * 編集コマンドの作成
 */
export function createEditCommand(): Command {
  const command = new Command('edit')
    .description('Edit text content')
    .argument('<name>', 'Name of the text content to edit')
    .option('-d, --data-dir <dir>', 'Data directory path', CCPM_HOME)
    .action(async (name: string, options: { dataDir: string }) => {
      await handleEdit(name, options);
    });

  return command;
}

/**
 * テキストコンテンツ編集処理のハンドラー
 */
async function handleEdit(name: string, options: { dataDir: string }): Promise<void> {
  const spinner = ora();
  
  try {
    // レジストリサービスを使用してコンテンツを検索
    const registryService = new RegistryService(options.dataDir);
    const repository = await registryService.find(name);
    
    if (!repository) {
      throw new NotFoundError('Text content', name);
    }
    
    // text://プロトコルのコンテンツのみ編集可能
    if (!repository.url.startsWith('text://')) {
      throw new Error(`Cannot edit non-text content. Use 'git' to modify repository: ${repository.name}`);
    }
    
    // テキストコンテンツのファイルパスを取得
    const textContentDir = path.join(options.dataDir, 'text-contents');
    const contentFile = path.join(textContentDir, `${repository.name}.md`);
    
    // ファイルが存在するか確認
    try {
      await fs.access(contentFile);
    } catch {
      throw new Error(`Content file not found: ${repository.name}`);
    }
    
    console.log(chalk.blue('📝 Opening editor for:'), repository.name);
    console.log(chalk.gray('File:'), contentFile);
    
    // エディタを開く
    const editor = process.env.EDITOR || 'vi';
    await new Promise<void>((resolve, reject) => {
      const editorProcess = spawn(editor, [contentFile], { stdio: 'inherit' });
      editorProcess.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error('Editor exited with error'));
      });
    });
    
    // 成功メッセージ
    console.log(chalk.green('✅ Edit complete'));
    console.log('\n' + chalk.blue('📋 Next Steps:'));
    console.log(chalk.gray('•'), `Run ${chalk.white('ccpm update ' + repository.name)} to deploy the changes`);
    console.log(chalk.gray('•'), `Run ${chalk.white('ccpm show ' + repository.name)} to view details`);
    
    // ログ記録
    logger.info('Text content edited', {
      name: repository.name,
      file: contentFile
    });
    
  } catch (error) {
    spinner.fail('Edit failed');
    
    if (error instanceof NotFoundError) {
      console.error(chalk.red('\n❌ Not Found:'), error.message);
      console.log(chalk.yellow('Run'), chalk.white('ccpm list'), chalk.yellow('to see all registered items.'));
      logger.error('Text content not found', error);
    } else if (error instanceof Error) {
      console.error(chalk.red('\n❌ Error:'), error.message);
      logger.error('Edit failed', error);
    }
    
    process.exit(1);
  }
}

/**
 * コマンドのエクスポート
 */
export default createEditCommand;