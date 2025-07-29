import * as readline from 'readline';
import { logger } from './logger';

/**
 * プロンプト表示のためのユーティリティ
 * WSL環境でのハング問題に対応
 */

/**
 * ユーザーに質問してy/n形式の回答を取得
 * @param question 質問文
 * @param defaultAnswer デフォルトの回答 (タイムアウト時に使用)
 * @param timeout タイムアウト時間（ミリ秒）
 * @returns true/falseの回答
 */
export async function promptYesNo(
  question: string,
  defaultAnswer: boolean = false,
  timeout: number = 30000
): Promise<boolean> {
  // CI環境や非インタラクティブモードではデフォルト値を返す
  if (!process.stdin.isTTY || process.env.CI) {
    logger.debug('Non-interactive mode detected, using default answer');
    return defaultAnswer;
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    let timeoutId: NodeJS.Timeout;

    const cleanup = () => {
      clearTimeout(timeoutId);
      rl.close();
      // WSL環境での問題を回避するため、明示的にstdinを一時停止
      process.stdin.pause();
    };

    // タイムアウト処理
    timeoutId = setTimeout(() => {
      logger.debug(`Prompt timeout after ${timeout}ms, using default answer`);
      cleanup();
      resolve(defaultAnswer);
    }, timeout);

    // 質問を表示
    rl.question(question, (answer) => {
      cleanup();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === 'y' || normalized === 'yes');
    });

    // Ctrl+Cハンドリング
    rl.on('SIGINT', () => {
      cleanup();
      process.exit(130); // 標準的なCtrl+Cの終了コード
    });

    // エラーハンドリング
    rl.on('error', (err) => {
      logger.error('Readline error:', err);
      cleanup();
      resolve(defaultAnswer);
    });
  });
}

/**
 * 複数の選択肢から選択
 * @param question 質問文
 * @param choices 選択肢の配列
 * @param defaultChoice デフォルトの選択肢インデックス
 * @returns 選択されたインデックス
 */
export async function promptChoice(
  question: string,
  choices: string[],
  defaultChoice: number = 0
): Promise<number> {
  // CI環境や非インタラクティブモードではデフォルト値を返す
  if (!process.stdin.isTTY || process.env.CI) {
    return defaultChoice;
  }

  const choicesText = choices.map((c, i) => `  ${i + 1}. ${c}`).join('\n');
  const fullQuestion = `${question}\n${choicesText}\nSelect (1-${choices.length}) [${defaultChoice + 1}]: `;

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    let timeoutId: NodeJS.Timeout;

    const cleanup = () => {
      clearTimeout(timeoutId);
      rl.close();
      process.stdin.pause();
    };

    timeoutId = setTimeout(() => {
      cleanup();
      resolve(defaultChoice);
    }, 30000);

    rl.question(fullQuestion, (answer) => {
      cleanup();
      const num = parseInt(answer.trim(), 10);
      if (isNaN(num) || num < 1 || num > choices.length) {
        resolve(defaultChoice);
      } else {
        resolve(num - 1);
      }
    });

    rl.on('SIGINT', () => {
      cleanup();
      process.exit(130);
    });

    rl.on('error', () => {
      cleanup();
      resolve(defaultChoice);
    });
  });
}