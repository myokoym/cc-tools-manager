/**
 * Type-based Deployment Integration Test
 * タイプ指定での登録・デプロイメントフローの統合テスト
 */

import * as path from 'path';
import { RegistryService } from '../../src/core/RegistryService';
import { GitManager } from '../../src/core/GitManager';
import { DeploymentService } from '../../src/core/DeploymentService';
import { Repository } from '../../src/types';
import * as fileSystem from '../../src/utils/file-system';

// モックの設定
jest.mock('../../src/utils/logger');
jest.mock('child_process');

describe('Type-based Deployment Integration', () => {
  const testDataDir = path.join(__dirname, '../fixtures/test-data');
  const testRepoPath = path.join(__dirname, '../fixtures/test-repo');
  const claudeDir = path.join(testDataDir, '.claude');
  
  let registryService: RegistryService;
  let gitManager: GitManager;
  let deploymentService: DeploymentService;
  
  beforeEach(async () => {
    // テストディレクトリをクリーンアップ
    await fileSystem.remove(testDataDir);
    await fileSystem.remove(testRepoPath);
    await fileSystem.ensureDir(testDataDir);
    await fileSystem.ensureDir(testRepoPath);
    
    // サービスのインスタンスを作成
    registryService = new RegistryService(testDataDir);
    gitManager = new GitManager(testDataDir);
    deploymentService = new DeploymentService();
    
    // モックレポジトリの構造を作成
    await createMockRepository(testRepoPath);
  });
  
  afterEach(async () => {
    // クリーンアップ
    await fileSystem.remove(testDataDir);
    await fileSystem.remove(testRepoPath);
  });
  
  describe('Type-based Registration and Deployment', () => {
    it('should register repository with type and deploy in type-based mode', async () => {
      // 1. タイプ指定でリポジトリを登録
      const repo = await registryService.register('https://github.com/test/repo', {
        type: 'commands'
      });
      
      expect(repo.type).toBe('commands');
      expect(repo.deploymentMode).toBe('type-based');
      
      // 2. GitManagerでクローンをモック（実際のクローンは避ける）
      repo.localPath = testRepoPath;
      repo.status = 'initialized';
      await registryService.updateRepository(repo.id, repo);
      
      // 3. デプロイメントを実行
      const result = await deploymentService.deploy(repo);
      
      // 4. 結果を検証
      expect(result.deployed.length).toBeGreaterThan(0);
      expect(result.failed.length).toBe(0);
      
      // 5. ファイルが正しい場所にデプロイされたか確認
      for (const deployedFile of result.deployed) {
        expect(deployedFile.target).toContain(path.join('.claude', 'commands'));
        expect(await fileSystem.fileExists(deployedFile.target)).toBe(true);
      }
    });
    
    it('should exclude README.md files from deployment', async () => {
      // タイプ指定でリポジトリを登録
      const repo = await registryService.register('https://github.com/test/repo', {
        type: 'agents'
      });
      
      repo.localPath = testRepoPath;
      repo.status = 'initialized';
      await registryService.updateRepository(repo.id, repo);
      
      // デプロイメントを実行
      const result = await deploymentService.deploy(repo);
      
      // README.mdがデプロイされていないことを確認
      const readmeDeployed = result.deployed.some(file => 
        file.source === 'README.md' || file.source === 'readme.md'
      );
      expect(readmeDeployed).toBe(false);
      
      // README.mdがスキップされたことを確認
      const readmeExists = await fileSystem.fileExists(path.join(testRepoPath, 'README.md'));
      expect(readmeExists).toBe(true);
    });
    
    it('should handle multiple file types in type-based deployment', async () => {
      // フックタイプで登録
      const repo = await registryService.register('https://github.com/test/hooks-repo', {
        type: 'hooks'
      });
      
      repo.localPath = testRepoPath;
      repo.status = 'initialized';
      await registryService.updateRepository(repo.id, repo);
      
      // デプロイメントを実行
      const result = await deploymentService.deploy(repo);
      
      // 各種ファイルタイプがデプロイされたことを確認
      const deployedExtensions = result.deployed.map(file => 
        path.extname(file.source)
      );
      
      expect(deployedExtensions).toContain('.js');
      expect(deployedExtensions).toContain('.ts');
      expect(deployedExtensions).toContain('.md');
      
      // すべてのファイルがhooksディレクトリにデプロイされたことを確認
      for (const deployedFile of result.deployed) {
        expect(deployedFile.target).toContain(path.join('.claude', 'hooks'));
      }
    });
    
    it('should preserve directory structure in type-based deployment', async () => {
      // サブディレクトリを含むテストケース
      await fileSystem.ensureDir(path.join(testRepoPath, 'subfolder'));
      await fileSystem.writeFile(
        path.join(testRepoPath, 'subfolder', 'nested-command.js'),
        'console.log("nested command");'
      );
      
      const repo = await registryService.register('https://github.com/test/nested-repo', {
        type: 'commands'
      });
      
      repo.localPath = testRepoPath;
      repo.status = 'initialized';
      await registryService.updateRepository(repo.id, repo);
      
      // デプロイメントを実行
      const result = await deploymentService.deploy(repo);
      
      // ネストされたファイルが正しくデプロイされたことを確認
      const nestedFile = result.deployed.find(file => 
        file.source === 'subfolder/nested-command.js'
      );
      
      expect(nestedFile).toBeDefined();
      expect(nestedFile?.target).toContain(path.join('.claude', 'commands', 'subfolder', 'nested-command.js'));
      expect(await fileSystem.fileExists(nestedFile!.target)).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle repository without type gracefully', async () => {
      // タイプなしでリポジトリを登録
      const repo = await registryService.register('https://github.com/test/no-type-repo');
      
      expect(repo.type).toBeUndefined();
      expect(repo.deploymentMode).toBeUndefined();
      
      repo.localPath = testRepoPath;
      repo.status = 'initialized';
      await registryService.updateRepository(repo.id, repo);
      
      // 通常のパターンベースデプロイメントにフォールバック
      const result = await deploymentService.deploy(repo);
      
      // .claudeディレクトリ構造を持つファイルのみがデプロイされることを確認
      expect(result.deployed.length).toBeGreaterThan(0);
      for (const deployedFile of result.deployed) {
        expect(deployedFile.source).toMatch(/^\.claude\//);
      }
    });
  });
});

/**
 * テスト用のモックリポジトリ構造を作成
 */
async function createMockRepository(repoPath: string): Promise<void> {
  // README.md
  await fileSystem.writeFile(
    path.join(repoPath, 'README.md'),
    '# Test Repository\nThis should not be deployed.'
  );
  
  // .claude ディレクトリ構造
  await fileSystem.ensureDir(path.join(repoPath, '.claude', 'commands'));
  await fileSystem.writeFile(
    path.join(repoPath, '.claude', 'commands', 'test-command.js'),
    'console.log("test command");'
  );
  
  // 直下のファイル（type-basedモードで含まれる）
  await fileSystem.writeFile(
    path.join(repoPath, 'direct-file.js'),
    'console.log("direct file");'
  );
  
  await fileSystem.writeFile(
    path.join(repoPath, 'another-file.ts'),
    'console.log("typescript file");'
  );
  
  await fileSystem.writeFile(
    path.join(repoPath, 'docs.md'),
    '# Documentation'
  );
  
  // package.json（type-basedモードで含まれる）
  await fileSystem.writeJsonFile(
    path.join(repoPath, 'package.json'),
    { name: 'test-repo', version: '1.0.0' }
  );
}