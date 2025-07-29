/**
 * RegistryService Tests
 * リポジトリの登録・削除・一覧管理のテスト
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { RegistryService } from '../../../src/core/RegistryService';
import { ValidationError, ConflictError, NotFoundError } from '../../../src/utils/errors';
import { Repository } from '../../../src/types';

// テスト用の一時ディレクトリ
const TEST_DATA_DIR = path.join(__dirname, '../../../tmp/test-registry');

describe('RegistryService', () => {
  let service: RegistryService;

  beforeEach(async () => {
    // テスト用ディレクトリをクリーンアップ
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    
    // サービスインスタンスを作成
    service = new RegistryService(TEST_DATA_DIR);
  });

  afterEach(async () => {
    // テスト用ディレクトリをクリーンアップ
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  });

  describe('register', () => {
    it('should register a valid GitHub repository', async () => {
      const url = 'https://github.com/owner/repo';
      const repository = await service.register(url);

      expect(repository).toMatchObject({
        name: 'owner/repo',
        url: url,
        status: 'uninitialized',
        deployments: {
          commands: [],
          agents: [],
          hooks: []
        }
      });
      expect(repository.id).toHaveLength(12);
      expect(repository.registeredAt).toBeDefined();
    });

    it('should normalize GitHub URLs', async () => {
      const url = 'https://github.com/owner/repo2.git';
      const repository = await service.register(url);

      // 正規化されたURLになるはず
      const normalizedUrl = 'https://github.com/owner/repo2';
      expect(repository.url).toBe(normalizedUrl);
      
      // 同じURLの異なるバリエーションは重複エラーになるはず
      const urlVariations = [
        'http://github.com/owner/repo2/',
        'https://github.com/owner/repo2?query=param#hash'
      ];
      
      for (const urlVar of urlVariations) {
        await expect(service.register(urlVar)).rejects.toThrow(ConflictError);
      }
    });

    it('should reject invalid URLs', async () => {
      const invalidUrls = [
        'not-a-url',
        'https://gitlab.com/owner/repo',
        'https://github.com/owner',
        'https://github.com/',
        'ftp://github.com/owner/repo',
        'https://github.com/owner/repo/../other'
      ];

      for (const url of invalidUrls) {
        await expect(service.register(url)).rejects.toThrow(ValidationError);
      }
    });

    it('should reject duplicate repositories', async () => {
      const url = 'https://github.com/owner/repo3';
      
      await service.register(url);
      await expect(service.register(url)).rejects.toThrow(ConflictError);
    });

    it('should persist repositories across restarts', async () => {
      const url = 'https://github.com/owner/repo4';
      const repo1 = await service.register(url);

      // 新しいサービスインスタンスを作成
      const newService = new RegistryService(TEST_DATA_DIR);
      const repositories = await newService.list();

      expect(repositories).toHaveLength(1);
      expect(repositories[0]).toEqual(repo1);
    });
  });

  describe('remove', () => {
    it('should remove a repository by ID', async () => {
      const url = 'https://github.com/owner/repo';
      const repo = await service.register(url);

      await service.remove(repo.id);
      
      const repositories = await service.list();
      expect(repositories).toHaveLength(0);
    });

    it('should remove a repository by name', async () => {
      const url = 'https://github.com/owner/repo';
      const repo = await service.register(url);

      await service.remove(repo.name);
      
      const repositories = await service.list();
      expect(repositories).toHaveLength(0);
    });

    it('should throw NotFoundError for non-existent repository', async () => {
      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('should persist removal across restarts', async () => {
      const url1 = 'https://github.com/owner/repo1';
      const url2 = 'https://github.com/owner/repo2';
      
      const repo1 = await service.register(url1);
      await service.register(url2);
      await service.remove(repo1.id);

      // 新しいサービスインスタンスを作成
      const newService = new RegistryService(TEST_DATA_DIR);
      const repositories = await newService.list();

      expect(repositories).toHaveLength(1);
      expect(repositories[0].name).toBe('owner/repo2');
    });
  });

  describe('list', () => {
    it('should return empty array when no repositories', async () => {
      const repositories = await service.list();
      expect(repositories).toEqual([]);
    });

    it('should return all registered repositories', async () => {
      const urls = [
        'https://github.com/owner1/repo1',
        'https://github.com/owner2/repo2',
        'https://github.com/owner3/repo3'
      ];

      for (const url of urls) {
        await service.register(url);
      }

      const repositories = await service.list();
      expect(repositories).toHaveLength(3);
      expect(repositories.map(r => r.name)).toEqual([
        'owner1/repo1',
        'owner2/repo2',
        'owner3/repo3'
      ]);
    });
  });

  describe('find', () => {
    it('should find repository by ID', async () => {
      const url = 'https://github.com/owner/repo';
      const registered = await service.register(url);

      const found = await service.find(registered.id);
      expect(found).toEqual(registered);
    });

    it('should find repository by name', async () => {
      const url = 'https://github.com/owner/repo';
      const registered = await service.register(url);

      const found = await service.find('owner/repo');
      expect(found).toEqual(registered);
    });

    it('should return null for non-existent repository', async () => {
      const found = await service.find('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('validateUrl', () => {
    it('should validate correct GitHub URLs', () => {
      const validUrls = [
        'https://github.com/owner/repo',
        'https://github.com/owner/repo.git',
        'https://github.com/owner/repo-name',
        'https://github.com/owner/repo.name',
        'https://github.com/owner-name/repo',
        'http://github.com/owner/repo',
        'https://www.github.com/owner/repo'
      ];

      for (const url of validUrls) {
        expect(service.validateUrl(url)).toBe(true);
      }
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'https://gitlab.com/owner/repo',
        'https://github.com/owner',
        'https://github.com/',
        'https://github.com/owner/repo/subpath',
        'git@github.com:owner/repo.git',
        'https://github.com/owner/repo with spaces'
      ];

      for (const url of invalidUrls) {
        expect(service.validateUrl(url)).toBe(false);
      }
    });
  });

  describe('checkDuplicate', () => {
    it('should detect duplicate repositories', async () => {
      const url = 'https://github.com/owner/repo';
      
      expect(await service.checkDuplicate(url)).toBe(false);
      
      await service.register(url);
      
      expect(await service.checkDuplicate(url)).toBe(true);
      expect(await service.checkDuplicate('https://github.com/owner/repo.git')).toBe(true);
      expect(await service.checkDuplicate('http://github.com/owner/repo/')).toBe(true);
    });

    it('should not detect different repositories as duplicates', async () => {
      await service.register('https://github.com/owner1/repo');
      
      expect(await service.checkDuplicate('https://github.com/owner2/repo')).toBe(false);
      expect(await service.checkDuplicate('https://github.com/owner1/repo2')).toBe(false);
    });
  });

  describe('update', () => {
    it('should update repository properties', async () => {
      const url = 'https://github.com/owner/repo';
      const repo = await service.register(url);

      const updated = await (service as any).update(repo.id, {
        status: 'active',
        lastUpdatedAt: new Date().toISOString(),
        localPath: '/path/to/clone',
        deployments: {
          commands: ['*.js'],
          agents: ['*.agent.js'],
          hooks: []
        }
      });

      expect(updated.status).toBe('active');
      expect(updated.lastUpdatedAt).toBeDefined();
      expect(updated.localPath).toBe('/path/to/clone');
      expect(updated.deployments.commands).toEqual(['*.js']);
      
      // 変更不可フィールドは変更されていないことを確認
      expect(updated.id).toBe(repo.id);
      expect(updated.url).toBe(repo.url);
      expect(updated.registeredAt).toBe(repo.registeredAt);
    });

    it('should throw NotFoundError for non-existent repository', async () => {
      await expect((service as any).update('non-existent', { status: 'active' }))
        .rejects.toThrow(NotFoundError);
    });

    it('should persist updates across restarts', async () => {
      const url = 'https://github.com/owner/repo';
      const repo = await service.register(url);

      await (service as any).update(repo.id, {
        status: 'active',
        deployments: {
          commands: ['*.js']
        }
      });

      // 新しいサービスインスタンスを作成
      const newService = new RegistryService(TEST_DATA_DIR);
      const found = await newService.find(repo.id);

      expect(found?.status).toBe('active');
      expect(found?.deployments.commands).toEqual(['*.js']);
    });
  });

  describe('file operations', () => {
    it('should create repository file with correct structure', async () => {
      const url = 'https://github.com/owner/repo';
      await service.register(url);

      const filePath = path.join(TEST_DATA_DIR, 'repositories.json');
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      expect(data).toMatchObject({
        version: '1.0',
        updatedAt: expect.any(String),
        repositories: expect.arrayContaining([
          expect.objectContaining({
            name: 'owner/repo',
            url: url
          })
        ])
      });
    });

    it('should handle missing repository file gracefully', async () => {
      // ファイルが存在しない状態でlistを呼ぶ
      const repositories = await service.list();
      expect(repositories).toEqual([]);
    });

    it('should handle corrupted repository file', async () => {
      const filePath = path.join(TEST_DATA_DIR, 'repositories.json');
      await fs.writeFile(filePath, 'invalid json', 'utf-8');

      // 新しいサービスインスタンスを作成
      const newService = new RegistryService(TEST_DATA_DIR);
      
      await expect(newService.list()).rejects.toThrow();
    });
  });
});