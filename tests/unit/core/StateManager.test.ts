import { StateManager } from '../../../src/core/StateManager';
import { Repository } from '../../../src/types';
import { GitUpdateResult } from '../../../src/core/interfaces/IGitManager';
import { DeploymentResult } from '../../../src/core/interfaces/IDeploymentService';
import * as fileSystem from '../../../src/utils/file-system';
import * as path from 'path';
import * as os from 'os';

// モック設定
jest.mock('../../../src/utils/file-system');

describe('StateManager', () => {
  let stateManager: StateManager;
  let tempDir: string;
  let mockFileSystem: jest.Mocked<typeof fileSystem>;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // テンポラリディレクトリの設定
    tempDir = path.join(os.tmpdir(), 'state-manager-test', Date.now().toString());
    
    // ファイルシステムのモック設定
    mockFileSystem = fileSystem as jest.Mocked<typeof fileSystem>;
    mockFileSystem.ensureDir.mockResolvedValue(undefined);
    mockFileSystem.fileExists.mockResolvedValue(false);
    mockFileSystem.readJsonFile.mockResolvedValue({});
    mockFileSystem.writeJsonFile.mockResolvedValue(undefined);
    mockFileSystem.createTempFile.mockResolvedValue(path.join(tempDir, 'temp.json'));
    mockFileSystem.moveFile.mockResolvedValue(undefined);
    mockFileSystem.remove.mockResolvedValue(undefined);
    mockFileSystem.getFileHash.mockResolvedValue('mock-hash-123');
    mockFileSystem.getAllFiles.mockResolvedValue([]);

    stateManager = new StateManager(path.join(tempDir, 'state.json'));
  });

  describe('初期化', () => {
    it('状態ファイルが存在しない場合、新しい状態を作成する', async () => {
      mockFileSystem.fileExists.mockResolvedValue(false);

      const state = await stateManager.getRepositoryState('test-repo');

      expect(state).toBeNull();
      expect(mockFileSystem.ensureDir).toHaveBeenCalled();
      expect(mockFileSystem.writeJsonFile).toHaveBeenCalled();
    });

    it('状態ファイルが破損している場合、新しい状態で初期化する', async () => {
      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readJsonFile.mockRejectedValue(new Error('Invalid JSON'));

      const state = await stateManager.getRepositoryState('test-repo');

      expect(state).toBeNull();
      expect(mockFileSystem.writeJsonFile).toHaveBeenCalled();
    });

    it('既存の状態ファイルを正しく読み込む', async () => {
      const existingState = {
        version: '1.0.0',
        repositories: {
          'test-repo': {
            lastSync: '2023-01-01T00:00:00Z',
            lastCommit: 'abc123',
            deployedFiles: [],
            errors: []
          }
        },
        metadata: {
          lastCleanup: null,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      };

      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readJsonFile.mockResolvedValue(existingState);

      const state = await stateManager.getRepositoryState('test-repo');

      expect(state).toEqual(existingState.repositories['test-repo']);
    });
  });

  describe('updateRepositoryState', () => {
    const mockRepo: Repository = {
      id: 'test-repo',
      name: 'test/repo',
      url: 'https://github.com/test/repo.git',
      registeredAt: new Date().toISOString(),
      status: 'active',
      deployments: {
        commands: ['tool1', 'tool2']
      }
    };

    const mockUpdateResult: GitUpdateResult = {
      hasUpdate: true,
      previousCommit: 'old123',
      latestCommit: 'new456',
      changedFiles: ['file1.js', 'file2.js']
    };

    const mockDeploymentResult: DeploymentResult = {
      success: true,
      deployedFiles: [
        { source: '/src/file1.js', target: '/dest/file1.js' },
        { source: '/src/file2.js', target: '/dest/file2.js' }
      ],
      errors: []
    };

    it('リポジトリの状態を正しく更新する', async () => {
      await stateManager.updateRepositoryState(mockRepo, mockUpdateResult, mockDeploymentResult);

      const state = await stateManager.getRepositoryState('test-repo');

      expect(state).toBeDefined();
      expect(state?.lastCommit).toBe('new456');
      expect(state?.deployedFiles).toHaveLength(2);
      expect(state?.deployedFiles[0].hash).toBe('mock-hash-123');
      expect(state?.errors).toEqual([]);
    });

    it('デプロイメントエラーを記録する', async () => {
      const deploymentWithErrors: DeploymentResult = {
        ...mockDeploymentResult,
        errors: ['Error 1', 'Error 2']
      };

      await stateManager.updateRepositoryState(mockRepo, mockUpdateResult, deploymentWithErrors);

      const state = await stateManager.getRepositoryState('test-repo');

      expect(state?.errors).toEqual(['Error 1', 'Error 2']);
    });

    it('ハッシュ計算に失敗してもデプロイメント情報を記録する', async () => {
      mockFileSystem.getFileHash.mockRejectedValue(new Error('Hash calculation failed'));

      await stateManager.updateRepositoryState(mockRepo, mockUpdateResult, mockDeploymentResult);

      const state = await stateManager.getRepositoryState('test-repo');

      expect(state?.deployedFiles[0].hash).toBe('unknown');
      expect(state?.deployedFiles[1].hash).toBe('unknown');
    });
  });

  describe('アトミックなファイル更新', () => {
    it('ロックファイルを使用してアトミックに更新する', async () => {
      const mockRepo: Repository = {
        id: 'test-repo',
        url: 'https://github.com/test/repo.git',
        branch: 'main',
        tools: []
      };

      // ロックファイルのモック
      mockFileSystem.fileExists
        .mockResolvedValueOnce(false) // 状態ファイル
        .mockResolvedValueOnce(false) // ロックファイル
        .mockResolvedValueOnce(false); // ロックファイル（2回目）

      await stateManager.updateRepositoryState(
        mockRepo,
        { hasUpdate: false, previousCommit: 'abc', latestCommit: 'abc', changedFiles: [] },
        { success: true, deployedFiles: [], errors: [] }
      );

      // ロックファイルの作成と削除を確認
      expect(mockFileSystem.writeJsonFile).toHaveBeenCalledWith(
        expect.stringContaining('.lock'),
        expect.objectContaining({ pid: expect.any(Number) })
      );
      expect(mockFileSystem.remove).toHaveBeenCalledWith(expect.stringContaining('.lock'));
    });

    it('ロックが取得できない場合はエラーをスローする', async () => {
      // ロックファイルが常に存在する
      mockFileSystem.fileExists.mockResolvedValue(true);

      const mockRepo: Repository = {
        id: 'test-repo',
        url: 'https://github.com/test/repo.git',
        branch: 'main',
        tools: []
      };

      await expect(
        stateManager.updateRepositoryState(
          mockRepo,
          { hasUpdate: false, previousCommit: 'abc', latestCommit: 'abc', changedFiles: [] },
          { success: true, deployedFiles: [], errors: [] }
        )
      ).rejects.toThrow('Unable to acquire lock for state file');
    });
  });

  describe('集計機能', () => {
    beforeEach(async () => {
      const mockState = {
        version: '1.0.0',
        repositories: {
          'repo1': {
            lastSync: '2023-01-01T00:00:00Z',
            lastCommit: 'abc123',
            deployedFiles: [
              { source: 'file1.js', target: 'dest1.js', hash: 'hash1', deployedAt: '2023-01-01T00:00:00Z' },
              { source: 'file2.js', target: 'dest2.js', hash: 'hash2', deployedAt: '2023-01-01T00:00:00Z' }
            ],
            errors: []
          },
          'repo2': {
            lastSync: '2023-01-02T00:00:00Z',
            lastCommit: 'def456',
            deployedFiles: [
              { source: 'file3.js', target: 'dest3.js', hash: 'hash3', deployedAt: '2023-01-02T00:00:00Z' }
            ],
            errors: []
          }
        },
        metadata: {
          lastCleanup: '2023-01-01T12:00:00Z',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-02T00:00:00Z'
        }
      };

      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readJsonFile.mockResolvedValue(mockState);
    });

    it('デプロイ済みファイルの総数を取得する', async () => {
      const total = await stateManager.getTotalDeployedFiles();
      expect(total).toBe(3);
    });

    it('最終クリーンアップ日時を取得する', async () => {
      const lastCleanup = await stateManager.getLastCleanupDate();
      expect(lastCleanup).toBe('2023-01-01T12:00:00Z');
    });

    it('クリーンアップ日時を更新する', async () => {
      await stateManager.updateCleanupDate();

      expect(mockFileSystem.writeJsonFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: expect.objectContaining({
            lastCleanup: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
          })
        }),
        2
      );
    });
  });

  describe('孤立ファイルの検出', () => {
    it('追跡されていないファイルを検出する', async () => {
      const mockState = {
        version: '1.0.0',
        repositories: {
          'repo1': {
            lastSync: '2023-01-01T00:00:00Z',
            lastCommit: 'abc123',
            deployedFiles: [
              { source: 'file1.js', target: '/deploy/file1.js', hash: 'hash1', deployedAt: '2023-01-01T00:00:00Z' },
              { source: 'file2.js', target: '/deploy/file2.js', hash: 'hash2', deployedAt: '2023-01-01T00:00:00Z' }
            ],
            errors: []
          }
        },
        metadata: {
          lastCleanup: null,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      };

      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readJsonFile.mockResolvedValue(mockState);
      mockFileSystem.getAllFiles.mockResolvedValue([
        '/deploy/file1.js',
        '/deploy/file2.js',
        '/deploy/orphaned1.js',
        '/deploy/orphaned2.js'
      ]);

      const orphaned = await stateManager.detectOrphanedFiles('/deploy');

      expect(orphaned).toEqual(['/deploy/orphaned1.js', '/deploy/orphaned2.js']);
    });

    it('すべてのファイルが追跡されている場合は空配列を返す', async () => {
      const mockState = {
        version: '1.0.0',
        repositories: {
          'repo1': {
            lastSync: '2023-01-01T00:00:00Z',
            lastCommit: 'abc123',
            deployedFiles: [
              { source: 'file1.js', target: '/deploy/file1.js', hash: 'hash1', deployedAt: '2023-01-01T00:00:00Z' }
            ],
            errors: []
          }
        },
        metadata: {
          lastCleanup: null,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      };

      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readJsonFile.mockResolvedValue(mockState);
      mockFileSystem.getAllFiles.mockResolvedValue(['/deploy/file1.js']);

      const orphaned = await stateManager.detectOrphanedFiles('/deploy');

      expect(orphaned).toEqual([]);
    });
  });

  describe('リセット機能', () => {
    it('特定のリポジトリの状態をリセットする', async () => {
      const mockState = {
        version: '1.0.0',
        repositories: {
          'repo1': {
            lastSync: '2023-01-01T00:00:00Z',
            lastCommit: 'abc123',
            deployedFiles: [],
            errors: []
          },
          'repo2': {
            lastSync: '2023-01-02T00:00:00Z',
            lastCommit: 'def456',
            deployedFiles: [],
            errors: []
          }
        },
        metadata: {
          lastCleanup: null,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      };

      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readJsonFile.mockResolvedValue(mockState);

      await stateManager.resetRepositoryState('repo1');

      expect(mockFileSystem.writeJsonFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          repositories: {
            'repo2': expect.any(Object)
          }
        }),
        2
      );
    });

    it('すべての状態をリセットする', async () => {
      await stateManager.resetAllState();

      expect(mockFileSystem.writeJsonFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          version: '1.0.0',
          repositories: {},
          metadata: expect.objectContaining({
            lastCleanup: null
          })
        }),
        2
      );
    });
  });
});