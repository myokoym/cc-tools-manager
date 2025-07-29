/**
 * Repository selector utilities
 * リポジトリを番号または名前で選択するためのユーティリティ
 */

import { RegistryService } from '../core/RegistryService';
import { Repository } from '../types/repository';
import chalk from 'chalk';

/**
 * リポジトリを番号またはIDで取得
 * @param identifier - リポジトリの番号（1-based）またはID/名前
 * @returns 見つかったリポジトリ、見つからない場合はnull
 */
export async function selectRepository(identifier: string): Promise<Repository | null> {
  const registryService = new RegistryService();
  const repositories = await registryService.list();
  
  // 番号として解釈を試みる
  const number = parseInt(identifier, 10);
  if (!isNaN(number) && number >= 1 && number <= repositories.length) {
    // 1-based indexなので-1する
    return repositories[number - 1];
  }
  
  // ID/名前として検索
  return repositories.find(repo => 
    repo.id === identifier || 
    repo.name === identifier ||
    repo.name.toLowerCase() === identifier.toLowerCase()
  ) || null;
}

/**
 * リポジトリリストを番号付きで表示（簡易版）
 * @param repositories - 表示するリポジトリリスト
 */
export function displayNumberedRepositories(repositories: Repository[]): void {
  console.log(chalk.bold('\nAvailable repositories:\n'));
  repositories.forEach((repo, index) => {
    console.log(chalk.gray(`${index + 1}.`) + ` ${repo.name}`);
  });
  console.log();
}

/**
 * 複数のリポジトリを選択
 * @param identifiers - リポジトリの番号またはID/名前の配列
 * @returns 見つかったリポジトリの配列
 */
export async function selectMultipleRepositories(identifiers: string[]): Promise<Repository[]> {
  const selected: Repository[] = [];
  const notFound: string[] = [];
  
  for (const identifier of identifiers) {
    const repo = await selectRepository(identifier);
    if (repo) {
      selected.push(repo);
    } else {
      notFound.push(identifier);
    }
  }
  
  if (notFound.length > 0) {
    console.warn(chalk.yellow(`Warning: The following repositories were not found: ${notFound.join(', ')}`));
  }
  
  return selected;
}