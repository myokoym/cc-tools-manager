/**
 * Show Command Integration Test
 * show コマンドの統合テスト - 完全なコマンド実行フローをテスト
 */

import { ShowCommand } from '../../src/commands/show';
import { RegistryService } from '../../src/core/RegistryService';
import { DeploymentMapper } from '../../src/services/deployment-mapper';
import { RepositoryStatusService } from '../../src/services/repository-status';
import { OutputFormatter } from '../../src/formatters/output-formatter';
import { Repository } from '../../src/types/repository';
import { DeploymentMapping, DeploymentInfo } from '../../src/services/deployment-mapper';
import { RepositoryStatusInfo } from '../../src/services/repository-status';

// モックの設定
jest.mock('../../src/utils/logger');
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
  }));
});

// コンソール出力をキャプチャするための設定
let consoleOutput: string[] = [];
let consoleErrorOutput: string[] = [];

beforeEach(() => {
  consoleOutput = [];
  consoleErrorOutput = [];
  
  jest.spyOn(console, 'log').mockImplementation((...args) => {
    consoleOutput.push(args.join(' '));
  });
  
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    consoleErrorOutput.push(args.join(' '));
  });
  
  // process.exit をモック
  jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
    throw new Error(`Process exit called with code: ${code}`);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Show Command Integration Tests', () => {
  let mockRegistryService: jest.Mocked<RegistryService>;
  let mockDeploymentMapper: jest.Mocked<DeploymentMapper>;
  let mockStatusService: jest.Mocked<RepositoryStatusService>;
  let mockFormatter: jest.Mocked<OutputFormatter>;
  let showCommand: ShowCommand;

  // テスト用のサンプルデータ
  const sampleRepository: Repository = {
    id: 'test-repo-id',
    name: 'test-repository',
    url: 'https://github.com/test/repository',
    registeredAt: '2024-01-01T00:00:00Z',
    lastUpdatedAt: '2024-01-02T00:00:00Z',
    deployments: {
      commands: ['*.js', '*.ts'],
      agents: ['agent-*.md'],
      hooks: ['hook-*.js']
    },
    type: 'commands',
    deploymentMode: 'type-based',
    status: 'active',
    localPath: '/Users/test/.claude/repositories/test-repository',
    version: '1.0.0'
  };

  const sampleDeploymentMapping: DeploymentMapping = {
    repository: sampleRepository,
    deployments: [
      {
        type: 'commands',
        files: ['command1.js', 'command2.ts'],
        status: 'active',
        deployedAt: '2024-01-02T00:00:00Z'
      },
      {
        type: 'agents',
        files: ['agent-test.md'],
        status: 'active',
        deployedAt: '2024-01-02T00:00:00Z'
      }
    ],
    totalFiles: 3,
    lastDeployment: '2024-01-02T00:00:00Z'
  };

  const sampleStatusInfo: RepositoryStatusInfo = {
    repository: sampleRepository,
    local: {
      exists: true,
      path: '/Users/test/.claude/repositories/test-repository',
      currentBranch: 'main',
      lastCommit: 'abc123',
      isDirty: false,
      diskSize: 1024000,
      fileCount: 10
    },
    deployment: {
      totalDeployedFiles: 3,
      lastDeploymentTime: '2024-01-02T00:00:00Z',
      deploymentErrors: [],
      activeDeployments: {
        commands: 2,
        agents: 1,
        hooks: 0
      }
    },
    health: {
      status: 'healthy',
      issues: [],
      lastChecked: '2024-01-02T00:00:00Z'
    }
  };

  beforeEach(() => {
    // サービスのモックを作成
    mockRegistryService = {
      find: jest.fn(),
    } as any;

    mockDeploymentMapper = {
      mapDeployments: jest.fn(),
      getDeployedFiles: jest.fn(),
    } as any;

    mockStatusService = {
      getRepositoryStatus: jest.fn(),
    } as any;

    mockFormatter = {
      formatRepository: jest.fn(),
      formatDeploymentMapping: jest.fn(),
      formatFileTree: jest.fn(),
    } as any;

    // ShowCommand インスタンスを作成
    showCommand = new ShowCommand(
      mockRegistryService,
      mockDeploymentMapper,
      mockStatusService,
      mockFormatter
    );
  });

  describe('Basic Show Command Execution', () => {
    it('should successfully execute show command with basic options', async () => {
      // モックの設定
      mockRegistryService.find.mockResolvedValue(sampleRepository);
      mockDeploymentMapper.mapDeployments.mockResolvedValue(sampleDeploymentMapping);
      mockStatusService.getRepositoryStatus.mockResolvedValue(sampleStatusInfo);
      mockFormatter.formatRepository.mockResolvedValue('Repository Information:\ntest-repository');
      mockFormatter.formatDeploymentMapping.mockResolvedValue('Deployment Information:\n3 files deployed');

      // コマンドを実行
      await showCommand.execute('test-repository', {});

      // 検証
      expect(mockRegistryService.find).toHaveBeenCalledWith('test-repository');
      expect(mockDeploymentMapper.mapDeployments).toHaveBeenCalledWith(sampleRepository);
      expect(mockFormatter.formatRepository).toHaveBeenCalledWith(
        sampleRepository,
        expect.objectContaining({
          format: 'table',
          verbose: undefined,
          colors: true
        })
      );
      expect(mockFormatter.formatDeploymentMapping).toHaveBeenCalledWith(
        sampleDeploymentMapping,
        expect.objectContaining({
          format: 'table',
          verbose: undefined,
          colors: true
        })
      );
      
      // 出力の確認
      expect(consoleOutput).toContainEqual('Repository Information:\ntest-repository');
      expect(consoleOutput).toContainEqual('Deployment Information:\n3 files deployed');
    });

    it('should handle repository not found error', async () => {
      // リポジトリが見つからない場合
      mockRegistryService.find.mockResolvedValue(null);

      // process.exit が呼ばれることを確認
      await expect(showCommand.execute('non-existent-repo', {})).rejects.toThrow('Process exit called with code: 1');

      expect(mockRegistryService.find).toHaveBeenCalledWith('non-existent-repo');
      expect(mockDeploymentMapper.mapDeployments).not.toHaveBeenCalled();
    });
  });

  describe('Option Combinations', () => {
    beforeEach(() => {
      mockRegistryService.find.mockResolvedValue(sampleRepository);
      mockDeploymentMapper.mapDeployments.mockResolvedValue(sampleDeploymentMapping);
      mockStatusService.getRepositoryStatus.mockResolvedValue(sampleStatusInfo);
    });

    it('should execute with --files-only option', async () => {
      const deployedFiles = [
        'command1.js',
        'command2.ts',
        'agent-test.md'
      ];
      
      mockDeploymentMapper.getDeployedFiles.mockResolvedValue(deployedFiles);
      mockFormatter.formatFileTree.mockResolvedValue('File Tree:\n├── command1.js\n├── command2.ts\n└── agent-test.md');

      await showCommand.execute('test-repository', { filesOnly: true });

      expect(mockDeploymentMapper.getDeployedFiles).toHaveBeenCalledWith(sampleRepository);
      expect(mockFormatter.formatFileTree).toHaveBeenCalledWith(
        deployedFiles,
        expect.objectContaining({
          format: 'table',
          verbose: undefined,
          colors: true
        })
      );
      
      // デプロイメント情報は表示されない
      expect(mockDeploymentMapper.mapDeployments).not.toHaveBeenCalled();
      expect(mockFormatter.formatRepository).not.toHaveBeenCalled();
    });

    it('should execute with --files-only and --tree options', async () => {
      const deployedFiles = ['command1.js', 'command2.ts'];
      
      mockDeploymentMapper.getDeployedFiles.mockResolvedValue(deployedFiles);
      mockFormatter.formatFileTree.mockResolvedValue('Tree format output');

      await showCommand.execute('test-repository', { filesOnly: true, tree: true });

      expect(mockFormatter.formatFileTree).toHaveBeenCalledWith(
        deployedFiles,
        expect.objectContaining({
          format: 'tree',
          verbose: undefined,
          colors: true
        })
      );
    });

    it('should execute with --verbose option', async () => {
      mockFormatter.formatRepository.mockResolvedValue('Verbose repository info');
      mockFormatter.formatDeploymentMapping.mockResolvedValue('Verbose deployment info');

      await showCommand.execute('test-repository', { verbose: true });

      expect(mockStatusService.getRepositoryStatus).toHaveBeenCalledWith(sampleRepository);
      expect(mockFormatter.formatRepository).toHaveBeenCalledWith(
        sampleRepository,
        expect.objectContaining({
          verbose: true
        })
      );
      expect(mockFormatter.formatDeploymentMapping).toHaveBeenCalledWith(
        sampleDeploymentMapping,
        expect.objectContaining({
          verbose: true
        })
      );
      
      // ステータス情報が表示されることを確認
      expect(consoleOutput.some(output => output.includes('Status Information:'))).toBe(true);
    });

    it('should execute with --skip-deployments option', async () => {
      mockFormatter.formatRepository.mockResolvedValue('Repository info only');

      await showCommand.execute('test-repository', { skipDeployments: true });

      expect(mockFormatter.formatRepository).toHaveBeenCalled();
      expect(mockDeploymentMapper.mapDeployments).not.toHaveBeenCalled();
      expect(mockFormatter.formatDeploymentMapping).not.toHaveBeenCalled();
    });
  });

  describe('Output Format Testing', () => {
    beforeEach(() => {
      mockRegistryService.find.mockResolvedValue(sampleRepository);
      mockDeploymentMapper.mapDeployments.mockResolvedValue(sampleDeploymentMapping);
      mockFormatter.formatRepository.mockResolvedValue('Formatted output');
      mockFormatter.formatDeploymentMapping.mockResolvedValue('Formatted deployment');
    });

    it('should use table format by default', async () => {
      await showCommand.execute('test-repository', {});

      expect(mockFormatter.formatRepository).toHaveBeenCalledWith(
        sampleRepository,
        expect.objectContaining({
          format: 'table'
        })
      );
    });

    it('should use json format when specified', async () => {
      await showCommand.execute('test-repository', { format: 'json' });

      expect(mockFormatter.formatRepository).toHaveBeenCalledWith(
        sampleRepository,
        expect.objectContaining({
          format: 'json'
        })
      );
      expect(mockFormatter.formatDeploymentMapping).toHaveBeenCalledWith(
        sampleDeploymentMapping,
        expect.objectContaining({
          format: 'json'
        })
      );
    });

    it('should use yaml format when specified', async () => {
      await showCommand.execute('test-repository', { format: 'yaml' });

      expect(mockFormatter.formatRepository).toHaveBeenCalledWith(
        sampleRepository,
        expect.objectContaining({
          format: 'yaml'
        })
      );
    });

    it('should use tree format when specified', async () => {
      await showCommand.execute('test-repository', { format: 'tree' });

      expect(mockFormatter.formatRepository).toHaveBeenCalledWith(
        sampleRepository,
        expect.objectContaining({
          format: 'tree'
        })
      );
    });
  });

  describe('Error Scenarios', () => {
    beforeEach(() => {
      mockRegistryService.find.mockResolvedValue(sampleRepository);
    });

    it('should handle deployment mapping errors gracefully', async () => {
      mockDeploymentMapper.mapDeployments.mockRejectedValue(new Error('Deployment mapping failed'));
      mockFormatter.formatRepository.mockResolvedValue('Repository info');

      await showCommand.execute('test-repository', {});

      expect(mockFormatter.formatRepository).toHaveBeenCalled();
      // エラーは警告として表示されるが、実行は続行される
      expect(consoleOutput.some(output => output.includes('Repository info'))).toBe(true);
    });

    it('should handle status service errors gracefully in verbose mode', async () => {
      mockDeploymentMapper.mapDeployments.mockResolvedValue(sampleDeploymentMapping);
      mockStatusService.getRepositoryStatus.mockRejectedValue(new Error('Status service failed'));
      mockFormatter.formatRepository.mockResolvedValue('Repository info');
      mockFormatter.formatDeploymentMapping.mockResolvedValue('Deployment info');

      await showCommand.execute('test-repository', { verbose: true });

      expect(mockFormatter.formatRepository).toHaveBeenCalled();
      expect(mockFormatter.formatDeploymentMapping).toHaveBeenCalled();
      // ステータス情報の取得に失敗してもコマンドは正常に完了する
    });

    it('should handle formatter errors', async () => {
      mockFormatter.formatRepository.mockRejectedValue(new Error('Formatter error'));

      await expect(showCommand.execute('test-repository', {})).rejects.toThrow('Process exit called with code: 1');
      
      expect(consoleErrorOutput.some(output => output.includes('Details:'))).toBe(true);
    });

    it('should handle files-only mode with no deployed files', async () => {
      mockDeploymentMapper.getDeployedFiles.mockResolvedValue([]);

      await showCommand.execute('test-repository', { filesOnly: true });

      expect(mockDeploymentMapper.getDeployedFiles).toHaveBeenCalledWith(sampleRepository);
      expect(mockFormatter.formatFileTree).not.toHaveBeenCalled();
    });

    it('should handle files-only mode with deployment mapper error', async () => {
      mockDeploymentMapper.getDeployedFiles.mockRejectedValue(new Error('Failed to get deployed files'));

      await showCommand.execute('test-repository', { filesOnly: true });

      expect(mockDeploymentMapper.getDeployedFiles).toHaveBeenCalledWith(sampleRepository);
      expect(mockFormatter.formatFileTree).not.toHaveBeenCalled();
    });
  });

  describe('Empty Repository Handling', () => {
    it('should handle repository with no local path', async () => {
      const repoWithoutLocalPath: Repository = {
        ...sampleRepository,
        localPath: undefined
      };

      const emptyDeploymentMapping: DeploymentMapping = {
        repository: repoWithoutLocalPath,
        deployments: [],
        totalFiles: 0
      };

      mockRegistryService.find.mockResolvedValue(repoWithoutLocalPath);
      mockDeploymentMapper.mapDeployments.mockResolvedValue(emptyDeploymentMapping);
      mockFormatter.formatRepository.mockResolvedValue('Repository without local path');
      mockFormatter.formatDeploymentMapping.mockResolvedValue('No deployments');

      await showCommand.execute('test-repository', {});

      expect(mockFormatter.formatRepository).toHaveBeenCalledWith(
        repoWithoutLocalPath,
        expect.any(Object)
      );
      expect(mockFormatter.formatDeploymentMapping).toHaveBeenCalledWith(
        emptyDeploymentMapping,
        expect.any(Object)
      );
    });

    it('should handle repository with no deployments', async () => {
      const repoWithoutDeployments: Repository = {
        ...sampleRepository,
        deployments: {}
      };

      mockRegistryService.find.mockResolvedValue(repoWithoutDeployments);
      mockDeploymentMapper.mapDeployments.mockResolvedValue({
        repository: repoWithoutDeployments,
        deployments: [],
        totalFiles: 0
      });
      mockFormatter.formatRepository.mockResolvedValue('Repository info');
      mockFormatter.formatDeploymentMapping.mockResolvedValue('No deployments');

      await showCommand.execute('test-repository', {});

      expect(mockDeploymentMapper.mapDeployments).toHaveBeenCalledWith(repoWithoutDeployments);
    });
  });

  describe('Service Mocking and Dependency Injection', () => {
    it('should use injected services correctly', () => {
      const customShowCommand = new ShowCommand(
        mockRegistryService,
        mockDeploymentMapper,
        mockStatusService,
        mockFormatter
      );

      expect(customShowCommand).toBeInstanceOf(ShowCommand);
    });

    it('should create default services when none provided', () => {
      const defaultShowCommand = new ShowCommand();
      expect(defaultShowCommand).toBeInstanceOf(ShowCommand);
    });

    it('should verify all service methods are called with correct parameters', async () => {
      mockRegistryService.find.mockResolvedValue(sampleRepository);
      mockDeploymentMapper.mapDeployments.mockResolvedValue(sampleDeploymentMapping);
      mockStatusService.getRepositoryStatus.mockResolvedValue(sampleStatusInfo);
      mockFormatter.formatRepository.mockResolvedValue('Test output');
      mockFormatter.formatDeploymentMapping.mockResolvedValue('Test deployment output');

      await showCommand.execute('test-repository', { verbose: true, format: 'json' });

      // 全てのサービスメソッドが適切なパラメータで呼ばれることを確認
      expect(mockRegistryService.find).toHaveBeenCalledTimes(1);
      expect(mockRegistryService.find).toHaveBeenCalledWith('test-repository');

      expect(mockDeploymentMapper.mapDeployments).toHaveBeenCalledTimes(1);
      expect(mockDeploymentMapper.mapDeployments).toHaveBeenCalledWith(sampleRepository);

      expect(mockStatusService.getRepositoryStatus).toHaveBeenCalledTimes(1);
      expect(mockStatusService.getRepositoryStatus).toHaveBeenCalledWith(sampleRepository);

      expect(mockFormatter.formatRepository).toHaveBeenCalledTimes(1);
      expect(mockFormatter.formatRepository).toHaveBeenCalledWith(
        sampleRepository,
        expect.objectContaining({
          format: 'json',
          verbose: true,
          colors: true
        })
      );

      expect(mockFormatter.formatDeploymentMapping).toHaveBeenCalledTimes(1);
      expect(mockFormatter.formatDeploymentMapping).toHaveBeenCalledWith(
        sampleDeploymentMapping,
        expect.objectContaining({
          format: 'json',
          verbose: true,
          colors: true
        })
      );
    });
  });
});