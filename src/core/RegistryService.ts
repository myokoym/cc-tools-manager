/**
 * RegistryService Implementation
 * リポジトリの登録・削除・一覧管理を実装
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { IRegistryService } from './interfaces/IRegistryService';
import { Repository, RepositoryDeployments } from '../types';
import { ValidationError, ConflictError, NotFoundError } from '../utils/errors';

export class RegistryService implements IRegistryService {
  private registryPath: string;
  private repositories: Map<string, Repository> = new Map();
  private loaded: boolean = false;

  constructor(stateManager?: any) {
    // StateManagerはオプショナルとして互換性を保つ
    const dataDir = path.join(process.cwd(), '.cc-tools');
    this.registryPath = path.join(dataDir, 'repositories.json');
  }

  /**
   * リポジトリを登録する
   */
  async register(url: string): Promise<Repository> {
    await this.ensureLoaded();

    // URL検証
    if (!this.validateUrl(url)) {
      throw new ValidationError('Invalid GitHub repository URL format', 'url', url);
    }

    // 正規化されたURLを取得
    const normalizedUrl = this.normalizeUrl(url);

    // 重複チェック
    if (await this.checkDuplicate(normalizedUrl)) {
      throw new ConflictError(`Repository already registered: ${normalizedUrl}`, 'repository');
    }

    // リポジトリ情報を作成
    const repository: Repository = {
      id: this.generateId(normalizedUrl),
      name: this.extractRepoName(normalizedUrl),
      url: normalizedUrl,
      registeredAt: new Date().toISOString(),
      deployments: {
        commands: [],
        agents: [],
        hooks: []
      },
      status: 'uninitialized'
    };

    // メモリに保存
    this.repositories.set(repository.id, repository);

    // ファイルに永続化
    await this.save();

    return repository;
  }

  /**
   * リポジトリを削除する
   */
  async remove(nameOrId: string): Promise<void> {
    await this.ensureLoaded();

    const repository = await this.find(nameOrId);
    if (!repository) {
      throw new NotFoundError('Repository', nameOrId);
    }

    // メモリから削除
    this.repositories.delete(repository.id);

    // ファイルに永続化
    await this.save();
  }

  /**
   * 登録済みリポジトリの一覧を取得する
   */
  async list(): Promise<Repository[]> {
    await this.ensureLoaded();
    return Array.from(this.repositories.values());
  }

  /**
   * 特定のリポジトリを検索する
   */
  async find(nameOrId: string): Promise<Repository | null> {
    await this.ensureLoaded();

    // IDで検索
    if (this.repositories.has(nameOrId)) {
      return this.repositories.get(nameOrId)!;
    }

    // 名前で検索
    for (const repo of this.repositories.values()) {
      if (repo.name === nameOrId) {
        return repo;
      }
    }

    return null;
  }

  /**
   * 特定のリポジトリを取得する（getメソッドのエイリアス）
   */
  async get(nameOrId: string): Promise<Repository | null> {
    return this.find(nameOrId);
  }

  /**
   * URLの形式を検証する
   */
  validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // GitHubのURLパターンをチェック
      const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+/;
      if (!githubPattern.test(url)) {
        return false;
      }

      // パスの構造をチェック
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      if (pathParts.length < 2) {
        return false;
      }

      // オーナーとリポジトリ名が有効かチェック
      const [owner, repo] = pathParts;
      const validNamePattern = /^[\w.-]+$/;
      if (!validNamePattern.test(owner) || !validNamePattern.test(repo)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * リポジトリの重複をチェックする
   */
  async checkDuplicate(url: string): Promise<boolean> {
    await this.ensureLoaded();
    
    const normalizedUrl = this.normalizeUrl(url);
    
    for (const repo of this.repositories.values()) {
      if (repo.url === normalizedUrl) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * リポジトリを更新する
   */
  async update(id: string, updates: Partial<Repository>): Promise<Repository> {
    await this.ensureLoaded();

    const repository = this.repositories.get(id);
    if (!repository) {
      throw new NotFoundError('Repository', id);
    }

    // 更新を適用
    const updatedRepository = {
      ...repository,
      ...updates,
      id: repository.id, // IDは変更不可
      url: repository.url, // URLは変更不可
      registeredAt: repository.registeredAt // 登録日時は変更不可
    };

    // メモリに保存
    this.repositories.set(id, updatedRepository);

    // ファイルに永続化
    await this.save();

    return updatedRepository;
  }

  /**
   * URLを正規化する
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // HTTPSに統一
      urlObj.protocol = 'https:';
      
      // .gitサフィックスを削除
      if (urlObj.pathname.endsWith('.git')) {
        urlObj.pathname = urlObj.pathname.slice(0, -4);
      }
      
      // 末尾のスラッシュを削除
      if (urlObj.pathname.endsWith('/')) {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      }
      
      // クエリパラメータとフラグメントを削除
      urlObj.search = '';
      urlObj.hash = '';
      
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * URLからリポジトリ名を抽出する
   */
  private extractRepoName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      
      if (pathParts.length >= 2) {
        return `${pathParts[0]}/${pathParts[1]}`;
      }
      
      return 'unknown/unknown';
    } catch {
      return 'unknown/unknown';
    }
  }

  /**
   * URLからIDを生成する
   */
  private generateId(url: string): string {
    return createHash('sha256').update(url).digest('hex').substring(0, 12);
  }

  /**
   * データをファイルから読み込む
   */
  private async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.registryPath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // バージョンチェック
      if (parsed.version !== '1.0') {
        throw new Error(`Unsupported registry version: ${parsed.version}`);
      }
      
      // リポジトリをマップに変換
      this.repositories.clear();
      for (const repo of parsed.repositories) {
        this.repositories.set(repo.id, repo);
      }
      
      this.loaded = true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // ファイルが存在しない場合は空のデータで初期化
        this.repositories.clear();
        this.loaded = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * データをファイルに保存する
   */
  private async save(): Promise<void> {
    const data = {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      repositories: Array.from(this.repositories.values())
    };

    // ディレクトリを確認
    await fs.mkdir(path.dirname(this.registryPath), { recursive: true });

    // ファイルに書き込み
    await fs.writeFile(
      this.registryPath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  }

  /**
   * データが読み込まれていることを確認する
   */
  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.load();
    }
  }

  /**
   * 特定のリポジトリを取得する（cli.tsとの互換性のため）
   */
  async getRepository(nameOrId: string): Promise<Repository | null> {
    return this.find(nameOrId);
  }
}