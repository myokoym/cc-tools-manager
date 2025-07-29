import { Repository } from '../../types';

/**
 * Registry Service Interface
 * リポジトリの登録・削除・一覧管理を担当
 */
export interface IRegistryService {
  /**
   * リポジトリを登録する
   * @param url - GitHub リポジトリのURL
   * @returns 登録されたリポジトリ情報
   * @throws InvalidUrlError - 無効なURL形式の場合
   * @throws DuplicateRepositoryError - 既に登録済みの場合
   */
  register(url: string): Promise<Repository>;

  /**
   * リポジトリを削除する
   * @param nameOrId - リポジトリ名またはID
   * @throws RepositoryNotFoundError - リポジトリが見つからない場合
   */
  remove(nameOrId: string): Promise<void>;

  /**
   * 登録済みリポジトリの一覧を取得する
   * @returns リポジトリの配列
   */
  list(): Promise<Repository[]>;

  /**
   * 特定のリポジトリを検索する
   * @param nameOrId - リポジトリ名またはID
   * @returns リポジトリ情報、見つからない場合はnull
   */
  find(nameOrId: string): Promise<Repository | null>;

  /**
   * URLの形式を検証する
   * @param url - 検証するURL
   * @returns URLが有効な場合true
   */
  validateUrl(url: string): boolean;

  /**
   * リポジトリの重複をチェックする
   * @param url - チェックするリポジトリURL
   * @returns 既に登録済みの場合true
   */
  checkDuplicate(url: string): Promise<boolean>;
}