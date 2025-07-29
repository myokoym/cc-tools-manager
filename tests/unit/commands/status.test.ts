/**
 * Status Command Tests
 */

import * as path from 'path';
import { statusCommand } from '../../src/commands/status';
import { RegistryService } from '../../src/core/RegistryService';
import { StateManager } from '../../src/core/StateManager';
import { Repository, RepositoryState } from '../../src/types';

// モック
jest.mock('../../src/core/RegistryService');
jest.mock('../../src/core/StateManager');
jest.mock('fs/promises');
jest.mock('../../src/utils/logger');

// chalk のモック
jest.mock('chalk', () => {
  const mockChalk = {
    red: jest.fn((str: string) => str),
    yellow: jest.fn((str: string) => str),
    green: jest.fn((str: string) => str),
    cyan: jest.fn((str: string) => str),
    gray: jest.fn((str: string) => str),
    bold: jest.fn((str: string) => str)
  };
  
  // bold.cyan のような連鎖呼び出しのサポート
  mockChalk.bold.cyan = jest.fn((str: string) => str);
  
  return {
    default: mockChalk,
    ...mockChalk
  };
});

// date-fns のモック
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date) => date.toISOString())
}));

describe('status command', () => {
  let mockRegistryService: jest.Mocked<RegistryService>;
  let mockStateManager: jest.Mocked<StateManager>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  const mockRepository: Repository = {
    id: 'test-id-123',
    name: 'test-user/test-repo',
    url: 'https://github.com/test-user/test-repo',
    registeredAt: '2024-01-01T00:00:00Z',
    deployments: {
      commands: ['test-command'],
      agents: [],
      hooks: []
    },
    status: 'active'
  };

  const mockRepositoryState: RepositoryState = {
    lastSync: '2024-01-02T00:00:00Z',
    lastCommit: 'abc123def456',
    deployedFiles: [
      {
        source: 'src/test.js',
        target: '/home/user/.claude/commands/test.js',
        hash: 'hash123',
        deployedAt: '2024-01-02T00:00:00Z'
      }
    ],
    errors: []
  };

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // RegistryService のモック
    mockRegistryService = new RegistryService() as jest.Mocked<RegistryService>;
    mockRegistryService.list = jest.fn().mockResolvedValue([mockRepository]);
    mockRegistryService.find = jest.fn().mockResolvedValue(mockRepository);
    (RegistryService as jest.MockedClass<typeof RegistryService>).mockImplementation(() => mockRegistryService);

    // StateManager のモック
    mockStateManager = new StateManager() as jest.Mocked<StateManager>;
    mockStateManager.getRepositoryState = jest.fn().mockResolvedValue(mockRepositoryState);
    (StateManager as jest.MockedClass<typeof StateManager>).mockImplementation(() => mockStateManager);

    // console のスパイ
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('基本動作', () => {
    it('すべてのリポジトリの状態を表示する', async () => {
      await status();

      expect(mockRegistryService.list).toHaveBeenCalledTimes(1);
      expect(mockStateManager.getRepositoryState).toHaveBeenCalledWith('test-id-123');
      expect(consoleLogSpy).toHaveBeenCalled();
      
      // 主要な情報が表示されているか確認
      const output = consoleLogSpy.mock.calls.flat().join('\n');
      expect(output).toContain('test-user/test-repo');
      expect(output).toContain('test-id-123');
      expect(output).toContain('https://github.com/test-user/test-repo');
    });

    it('登録されているリポジトリがない場合の表示', async () => {
      mockRegistryService.list.mockResolvedValue([]);

      await status();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('登録されているリポジトリはありません')
      );
    });

    it('特定のリポジトリの状態を表示する', async () => {
      await status({ nameOrId: 'test-repo' });

      expect(mockRegistryService.find).toHaveBeenCalledWith('test-repo');
      expect(mockStateManager.getRepositoryState).toHaveBeenCalledWith('test-id-123');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('存在しないリポジトリを指定した場合', async () => {
      mockRegistryService.find.mockResolvedValue(null);

      await expect(status({ nameOrId: 'non-existent' })).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("リポジトリ 'non-existent' が見つかりません")
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('状態情報の表示', () => {
    it('状態情報がない場合の表示', async () => {
      mockStateManager.getRepositoryState.mockResolvedValue(null);

      await status();

      const output = consoleLogSpy.mock.calls.flat().join('\n');
      expect(output).toContain('状態情報なし - 未同期');
    });

    it('エラーがある場合の表示', async () => {
      const stateWithErrors = {
        ...mockRepositoryState,
        errors: ['Error 1', 'Error 2']
      };
      mockStateManager.getRepositoryState.mockResolvedValue(stateWithErrors);

      await status();

      const output = consoleLogSpy.mock.calls.flat().join('\n');
      expect(output).toContain('エラー数:');
    });

    it('デプロイメント設定の表示', async () => {
      const repoWithMultipleDeployments = {
        ...mockRepository,
        deployments: {
          commands: ['cmd1', 'cmd2'],
          agents: ['agent1'],
          hooks: ['hook1', 'hook2', 'hook3']
        }
      };
      mockRegistryService.list.mockResolvedValue([repoWithMultipleDeployments]);

      await status();

      const output = consoleLogSpy.mock.calls.flat().join('\n');
      expect(output).toContain('commands(2)');
      expect(output).toContain('agents(1)');
      expect(output).toContain('hooks(3)');
    });
  });

  describe('詳細表示モード', () => {
    it('verbose オプションで詳細情報を表示', async () => {
      const stateWithMultipleFiles = {
        ...mockRepositoryState,
        deployedFiles: [
          {
            source: 'src/file1.js',
            target: '/path/to/file1.js',
            hash: 'hash1',
            deployedAt: '2024-01-03T00:00:00Z'
          },
          {
            source: 'src/file2.js',
            target: '/path/to/file2.js',
            hash: 'hash2',
            deployedAt: '2024-01-02T00:00:00Z'
          }
        ]
      };
      mockStateManager.getRepositoryState.mockResolvedValue(stateWithMultipleFiles);

      await status({ verbose: true });

      const output = consoleLogSpy.mock.calls.flat().join('\n');
      expect(output).toContain('最近のデプロイ:');
      expect(output).toContain('file1.js'); // 最新のファイル
    });

    it('verbose モードでエラー詳細を表示', async () => {
      const stateWithErrors = {
        ...mockRepositoryState,
        errors: ['Error 1', 'Error 2', 'Error 3', 'Error 4']
      };
      mockStateManager.getRepositoryState.mockResolvedValue(stateWithErrors);

      await status({ verbose: true });

      const output = consoleLogSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Error 1');
      expect(output).toContain('Error 2');
      expect(output).toContain('Error 3');
      expect(output).toContain('他 1 エラー');
    });
  });

  describe('JSON出力', () => {
    it('JSON形式で出力', async () => {
      await status({ json: true });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      
      // JSON形式であることを確認
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toHaveProperty('repository');
      expect(parsed[0]).toHaveProperty('state');
      expect(parsed[0]).toHaveProperty('localInfo');
      expect(parsed[0]).toHaveProperty('summary');
    });
  });

  describe('サマリー表示', () => {
    it('複数リポジトリのサマリーを表示', async () => {
      const repositories = [
        { ...mockRepository, id: 'repo1', status: 'active' },
        { ...mockRepository, id: 'repo2', status: 'error' },
        { ...mockRepository, id: 'repo3', status: 'uninitialized' }
      ];
      mockRegistryService.list.mockResolvedValue(repositories);

      await status();

      const output = consoleLogSpy.mock.calls.flat().join('\n');
      expect(output).toContain('サマリー');
      expect(output).toContain('総リポジトリ数: 3');
      expect(output).toContain('アクティブ: 1');
      expect(output).toContain('エラー: 1');
    });
  });

  describe('エラーハンドリング', () => {
    it('RegistryService のエラーを処理', async () => {
      mockRegistryService.list.mockRejectedValue(new Error('Registry error'));

      await expect(status()).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('状態の取得に失敗しました')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('StateManager のエラーを処理', async () => {
      mockStateManager.getRepositoryState.mockRejectedValue(new Error('State error'));

      await expect(status()).rejects.toThrow('process.exit called');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('状態の取得に失敗しました')
      );
    });
  });
});